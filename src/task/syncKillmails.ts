import moment = require("moment");

import { Tnex, val } from "../db/tnex";
import { dao } from "../db/dao";
import { JobLogger } from "../infra/taskrunner/Job";
import { MemberCorporation } from "../db/tables";
import { createPendingBattles } from "../domain/battle/createPendingBattles";
import { Task } from "../infra/taskrunner/Task";
import { processNewKillmails } from "./syncKillmails/process/processNewKillmails";
import { fetchKillmails } from "./syncKillmails/fetch/fetchKillmails";

/**
 * Downloads and stores any recent killmails for all member and affiliated
 * corporations. Also creates SRP entries for each loss, possibly rendering
 * verdicts for some of them if the triage rules dictate it.
 *
 * For new corporations, fetches the last 60 days of losses; for
 * existing corporations, fetches all new losses since the last sync.
 *
 * Uses Zkillboard as a backend.
 */
export const syncKillmails: Task = {
  name: "syncKillmails",
  displayName: "Sync corp killmails",
  description: "Used to track SRP",
  timeout: moment.duration(5, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  const config = await dao.config.get(
    db,
    "srpJurisdiction",
    "killmailSyncRanges"
  );
  const memberCorps = await dao.config.getMemberCorporations(db);

  if (config.srpJurisdiction == null) {
    return;
  }
  let syncedRanges = config.killmailSyncRanges || {};

  syncedRanges = await syncKillmailsForAllCorps(
    db,
    job,
    config.srpJurisdiction,
    memberCorps,
    syncedRanges
  );

  await dao.config.set(db, { killmailSyncRanges: syncedRanges });
  await db.asyncTransaction(async (db) => {
    await processNewKillmails(db, job);
    await createPendingBattles(db, job);
  });
}

async function syncKillmailsForAllCorps(
  db: Tnex,
  job: JobLogger,
  jurisdiction: { start: number; end: number | undefined },
  memberCorps: MemberCorporation[],
  syncedRanges: { [key: number]: { start: number; end: number } }
) {
  for (const memberCorp of memberCorps) {
    try {
      const corpId = memberCorp.mcorp_corporationId;
      syncedRanges[corpId] = await syncKillmailsForCorp(
        db,
        job,
        memberCorp.mcorp_corporationId,
        syncedRanges[corpId],
        jurisdiction
      );
    } catch (e) {
      job.error(
        `Error while syncing kills for corp ` +
          `${memberCorp.mcorp_corporationId}`,
        e
      );
    }
  }

  return syncedRanges;
}

async function syncKillmailsForCorp(
  db: Tnex,
  job: JobLogger,
  corpId: number,
  syncedRange: { start: number; end: number } | undefined,
  jurisdiction: { start: number; end: number | undefined }
) {
  if (syncedRange == undefined || syncedRange.start > jurisdiction.start) {
    job.info(`Performing pre-range fill...`);
    await fetchKillmails(
      db,
      job,
      corpId,
      jurisdiction.start,
      syncedRange && syncedRange.start
    );
  }
  if (
    syncedRange != undefined &&
    (jurisdiction.end == undefined || syncedRange.end < jurisdiction.end)
  ) {
    // Fetch a day's worth of previous killmails since it may take some time
    // for all mails to get to zkill (CCP asplode, etc.)
    const start = moment(syncedRange.end).subtract(1, "day").valueOf();
    await fetchKillmails(db, job, corpId, start, jurisdiction.end);
  }

  return { start: jurisdiction.start, end: Date.now() };
}
