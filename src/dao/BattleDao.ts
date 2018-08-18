import { Dao } from '../dao';
import { Tnex, val, ResultOrder } from '../tnex';
import { killmail, killmailBattle, battle, Battle, srpVerdict } from './tables';
import { SrpVerdictStatus } from './enums';

export default class BattleDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  async getEarliestUngroupedKillmailTimestamp(db: Tnex) {
    return db
        .select(killmail)
        .leftJoin(killmailBattle, 'kmb_killmail', '=', 'km_id')
        .whereNull('kmb_killmail')
        .orderBy('km_timestamp', 'asc')
        .orderBy('km_id', 'asc')
        .limit(1)
        .columns(
            'km_timestamp',
            )
        .fetchFirst();
  }

  getKillmailsWithoutBattlesIterator(db: Tnex, batchSize: number) {
    return {
      _prevTimestamp: null as number | null,
      _previousMails: new Set<number>(),

      async next() {
        let query = db
            .select(killmail)
            .leftJoin(killmailBattle, 'kmb_killmail', '=', 'km_id')
            .whereNull('kmb_killmail')
            .orderBy('km_timestamp', 'asc')
            .orderBy('km_id', 'asc')
            .columns(
                'km_timestamp',
                'km_data',
                )
            .limit(batchSize)

        if (this._prevTimestamp != null) {
          query = query.where('km_timestamp', '>=', val(this._prevTimestamp));
        }
        let rows = await query.run();
        rows = rows.filter(
            row => !this._previousMails.has(row.km_data.killmail_id));

        if (rows.length > 0) {
          this._prevTimestamp = rows[rows.length - 1].km_timestamp;
          this._previousMails.clear();
          for (let i = rows.length - 1; i >= 0; i--) {
            let row = rows[i];
            if (row.km_timestamp != this._prevTimestamp) {
              break;
            }
            this._previousMails.add(row.km_data.killmail_id);
          }
        }
        return rows;
      }
    };
  }

  createBattle(db: Tnex, row: Battle) {
    return db.insert(battle, row, 'battle_id');
  }

  deleteBattle(db: Tnex, id: number) {
    return db
        .del(battle)
        .where('battle_id', '=', val(id))
        .run();
  }

  updateBattle(db: Tnex, id: number, newVals: Partial<Battle>) {
    return db
        .update(battle, newVals)
        .where('battle_id', '=', val(id))
        .run();
  }

  setAssociatedKillmails(db: Tnex, battleId: number, killmails: number[]) {
    return db.upsertAll(
        killmailBattle,
        killmails.map(kmId => ({
          kmb_killmail: kmId,
          kmb_battle: battleId,
        })),
        'kmb_killmail');
  }

  getBattlesWithinRange(db: Tnex, start: number, end: number) {
    return db
        .select(battle)
        .where('battle_end', '>=', val(start))
        .where('battle_start', '<=', val(end))
        .columns(
            'battle_id',
            'battle_start',
            'battle_end',
            'battle_data',
            )
        .run();
  }
}
