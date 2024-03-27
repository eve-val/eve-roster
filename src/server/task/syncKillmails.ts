import moment from "moment";

import { dao } from "../db/dao.js";
import { Tnex } from "../db/tnex/Tnex.js";
import { Task } from "../infra/taskrunner/Task.js";
import { createPendingBattles } from "../domain/battle/createPendingBattles.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { processNewKillmails } from "./syncKillmails/process/processNewKillmails.js";
import { fetchKillmails } from "./syncKillmails/fetch/fetchKillmails.js";
import { EsiEntity, esiCorp } from "../data-source/esi/EsiEntity.js";

/**
 * Downloads and stores any recent killmails for all member and affiliated
 * corporations. Also creates SRP entries for each loss, possibly rendering
 * verdicts for some of them if the triage rules dictate it.
 */
export const syncKillmails: Task = {
  name: "syncKillmails",
  displayName: "Sync corp killmails",
  description: "Used to track SRP",
  timeout: moment.duration(20, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  const syncResults = await syncKillmailsForAllCorps(db, job);

  const [processResult, battleResult] = await db.asyncTransaction(
    async (db) => {
      const processResult = await processNewKillmails(db, job);
      const battleResult = await createPendingBattles(db, job);

      return [processResult, battleResult];
    },
  );

  const finalResults = {
    sync: syncResults,
    process: processResult,
    battle: battleResult,
  };

  job.info(JSON.stringify(finalResults, undefined, 2));
}

async function syncKillmailsForAllCorps(db: Tnex, job: JobLogger) {
  const memberCorps = await dao.config.getSrpMemberCorporations(db);
  const config = await dao.config.get(
    db,
    "srpJurisdiction",
    "killmailSyncRanges",
  );
  if (config.srpJurisdiction == null) {
    return;
  }
  const syncedRanges = config.killmailSyncRanges ?? {};
  const syncResults: SyncResult[] = [];

  for (const memberCorp of memberCorps) {
    const corp = esiCorp(memberCorp.mcorp_corporationId, memberCorp.mcorp_name);

    const jurisdictionStarts = moment(config.srpJurisdiction.start);
    // Fetch a day's worth of previous killmails since it may take some time
    // for all mails to get to zkill (CCP asplode, etc.)
    const historyEnds = moment(syncedRanges[corp.id]?.end ?? 0).subtract(
      24,
      "hours",
    );

    const fetchAfter = moment.max(jurisdictionStarts, historyEnds);

    const syncResult: SyncResult = {
      corp,
      newMailCount: 0,
      earliestTimestamp: 0,
      latestTimestamp: 0,
      encounteredError: false,
    };
    syncResults.push(syncResult);

    job.info(
      `Syncing killmails for corp ${corp} occurring after ${fetchAfter}...`,
    );

    try {
      const { earliestTimestamp, latestTimestamp, fetchedCount, newCount } =
        await fetchKillmails(db, job, corp, fetchAfter);

      syncedRanges[corp.id] = {
        start: syncedRanges[corp.id]?.start ?? historyEnds.valueOf(),
        end: latestTimestamp.valueOf(),
      };
      syncResult.newMailCount = newCount;
      syncResult.earliestTimestamp = earliestTimestamp.valueOf();
      syncResult.latestTimestamp = latestTimestamp.valueOf();
      job.info(
        `Synced ${newCount} new killmails for ${corp} (${fetchedCount}` +
          ` fetched total) from ${earliestTimestamp.toISOString()} to` +
          ` ${latestTimestamp.toISOString()}`,
      );
    } catch (e) {
      syncResult.encounteredError = true;
      job.error(`Error while syncing kills for corp ${corp}`, e);
    }
  }

  await dao.config.set(db, { killmailSyncRanges: syncedRanges });

  return syncResults;
}

interface SyncResult {
  corp: EsiEntity;
  newMailCount: number;
  earliestTimestamp: number;
  latestTimestamp: number;
  encounteredError: boolean;
}
