import { Dao } from "../dao";
import { Tnex, val } from "../../db/tnex";
import { killmail, Killmail } from "../tables";

export default class KillmailDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  async getKillmail(db: Tnex, id: number) {
    return await db
        .select(killmail)
        .where('km_id', '=', val(id))
        .columns(
            'km_id',
            'km_timestamp',
            'km_type',
            'km_character',
            'km_sourceCorporation',
            'km_data',
            )
        .fetchFirst();
  }

  async upsertKillmails(db: Tnex, rows: Killmail[]) {
    return db.upsertAll(killmail, rows, 'km_id');
  }
}
