import { Moment } from "moment";

import {
  killmail,
  srpVerdict,
  srpReimbursement,
  battle,
  killmailBattle,
} from "../../db/tables.js";
import { Tnex } from "../../db/tnex/Tnex.js";
import { val } from "../../db/tnex/core.js";
import { JobLogger } from "../../infra/taskrunner/Job.js";
import { dao } from "../../db/dao.js";

/**
 * For use in local development. Should not be used in production.
 */
export async function deleteRecentKillmails(
  db: Tnex,
  job: JobLogger,
  deleteAfter: Moment,
) {
  await db.transaction(async (db: Tnex) => {
    job.info(
      `Deleting all killmails since ${deleteAfter} (${deleteAfter.valueOf()})`,
    );

    // Delete all killmails after the cutoff
    const kmCount = await db
      .del(killmail)
      .where("km_timestamp", ">", val(deleteAfter.valueOf()))
      .run();

    job.info(`Deleted ${kmCount} killmails`);

    // Delete all battles that are now empty
    const battleIds = await db
      .select(battle)
      .join(
        db
          .subselect(battle, "bc")
          .leftJoin(killmailBattle, "kmb_battle", "=", "battle_id")
          .groupBy("battle_id")
          .count("kmb_killmail", "bc_kmCount")
          .columnAs("battle_id", "bc_id"),
        "bc_id",
        "=",
        "battle_id",
      )
      .where("bc_kmCount", "=", val(0))
      .columns("battle_id")
      .run();

    job.info(`Found ${battleIds.length} battles to delete`);

    const battleCount = await db
      .del(battle)
      .whereIn(
        "battle_id",
        battleIds.map((row) => row.battle_id),
      )
      .run();

    // Delete all reimbursements that are now empty
    const reimbIds = await db
      .select(srpReimbursement)
      .join(
        db
          .subselect(srpReimbursement, "rc")
          .leftJoin(srpVerdict, "srpv_reimbursement", "=", "srpr_id")
          .groupBy("srpr_id")
          .count("srpv_killmail", "rc_verdictCount")
          .columnAs("srpr_id", "rc_id"),
        "rc_id",
        "=",
        "srpr_id",
      )
      .where("rc_verdictCount", "=", val(0))
      .columns("srpr_id")
      .run();

    job.info(`Found ${reimbIds.length} reimbursements to delete`);

    const reimbursementCount = await db
      .del(srpReimbursement)
      .whereIn(
        "srpr_id",
        reimbIds.map((row) => row.srpr_id),
      )
      .run();

    // Rollback sync dates to match the cutoff
    const config = await dao.config.get(db, "killmailSyncRanges");

    if (config.killmailSyncRanges) {
      for (const corpId in config.killmailSyncRanges) {
        const range = config.killmailSyncRanges[corpId];
        range.end = Math.min(range.end, deleteAfter.valueOf());
        range.start = Math.min(range.start, deleteAfter.valueOf());
      }
      await dao.config.set(db, config);
    }

    job.info(
      `Deleted ${kmCount} killmails, ${reimbursementCount}` +
        ` reimbursements, and ${battleCount} battles`,
    );
  });
}
