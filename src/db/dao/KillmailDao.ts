import { Dao } from "../dao";
import { Tnex, val, UpdateStrategy } from "../../db/tnex";
import {
  killmail,
  Killmail,
  srpVerdict,
  account,
  memberCorporation,
  ownership,
} from "../tables";
import { makeKillmailIterator } from "../shared/makeKillmailIterator";
import { StreamIterator } from "../../util/stream/BatchedObjectReadable";

export default class KillmailDao {
  constructor(private _dao: Dao) {}

  async getKillmail(db: Tnex, id: number) {
    return await db
      .select(killmail)
      .where("km_id", "=", val(id))
      .columns("km_id", "km_timestamp", "km_character", "km_data")
      .fetchFirst();
  }

  getEarliestUnprocessedKillmail(db: Tnex) {
    return db
      .select(killmail)
      .where("km_processed", "=", val(false))
      .orderBy("km_timestamp", "asc")
      .orderBy("km_id", "asc")
      .limit(1)
      .columns("km_timestamp")
      .fetchFirst();
  }

  getUnprocessedKillmailIterator(
    db: Tnex,
    batchSize: number,
    preWindowStart: number,
    preWindowEnd: number
  ): StreamIterator<UnprocessedKillmailRow> {
    return makeKillmailIterator(db, batchSize, (query) =>
      query
        .leftJoin(srpVerdict, "srpv_killmail", "=", "km_id")
        .leftJoin(ownership, "ownership_character", "=", "km_character")
        .leftJoin(account, "account_id", "=", "ownership_account")
        .leftJoin(
          memberCorporation,
          "mcorp_corporationId",
          "=",
          "km_victimCorp"
        )
        .and((clause) => {
          clause.where("km_processed", "=", val(false)).or((clause) => {
            clause
              .where("km_timestamp", ">=", val(preWindowStart))
              .where("km_timestamp", "<=", val(preWindowEnd));
          });
        })
        .columns("account_mainCharacter", "mcorp_corporationId")
    );
  }

  async upsertKillmails(
    db: Tnex,
    rows: Killmail[],
    updateStrategy?: UpdateStrategy<Partial<Killmail>>
  ) {
    return db.upsertAll(killmail, rows, "km_id", updateStrategy);
  }

  async updateKillmails(
    db: Tnex,
    rows: Partial<Killmail> & Pick<Killmail, "km_id">[]
  ) {
    return db.updateAll(killmail, "km_id", rows);
  }
}

export type UnprocessedKillmailRow = Killmail & {
  account_mainCharacter: number | null;
} & { mcorp_corporationId: number | null };
