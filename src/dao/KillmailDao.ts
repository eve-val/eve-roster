import { Dao } from "../dao";
import { Tnex, val } from "../tnex";
import { killmail, Killmail } from "./tables";

export default class KillmailDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  /**
   * Looks up the most recent killmail that was retrieved from
   * {{corporation}}'s killboard.
   */
  async getMostRecentKillmail(
      db: Tnex, corporation: number): Promise<Killmail | null> {
    return await db
        .select(killmail)
        .where('km_sourceCorporation', '=', val(corporation))
        .orderBy('km_timestamp', 'desc')
        .limit(1)
        .columns(
            'km_id',
            'km_timestamp',
            'km_type',
            'km_hullCategory',
            'km_relatedLoss',
            'km_character',
            'km_sourceCorporation',
            'km_data',
            )
        .fetchFirst();
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

  async hasKillmail(db: Tnex, id: number) {
    const row = await db
        .select(killmail)
        .where('km_id', '=', val(id))
        .fetchFirst();
    return row != null;
  }

  async storeKillmail(db: Tnex, mail: Killmail) {
    return await db.insert(killmail, mail);
  }

  async setRelatedLoss(db: Tnex, loss: number, relatedLoss: number) {
    return await db
        .update(killmail, {
          km_relatedLoss: relatedLoss,
        })
        .where('km_id', '=', val(loss))
        .run();
  }
}
