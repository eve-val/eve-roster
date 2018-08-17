import { Writable } from 'stream';
import { BattleResult } from './BattleCreator';
import { Tnex, DEFAULT_NUM } from '../../tnex';
import { dao } from '../../dao';
import { BattleData } from './BattleData';


/**
 * Writes the output of BattleCreator to the database.
 */
export class BattleWriter extends Writable {
  private readonly _db: Tnex;

  constructor(db: Tnex) {
    super({
      objectMode: true,
    });
    this._db = db;
  }

  _write(chunk: any, encoding: string, callback: (err?: Error) => void) {
    this._writeBattle(chunk as BattleResult, callback)
    .catch(err => {
      this.emit('error', err);
    });
  }

  private async _writeBattle(
      result: BattleResult,
      callback: (err?: Error) => void,
  ) {
    if (result.type == 'deleted') {
      await dao.battle.deleteBattle(this._db, result.battleId);
    } else {
      let battle = result.battle;
      let battleId = battle.id;
      const data: BattleData = {
        start: battle.start,
        end: battle.end,
        locations: Array.from(battle.locations),
        killmails: Array.from(battle.killmails),
        participants: Array.from(battle.participants.values()),
      };
      if (battleId == null) {
        battleId = await dao.battle.createBattle(this._db, {
          battle_id: DEFAULT_NUM,
          battle_start: battle.start,
          battle_end: battle.end,
          battle_data: data,
        });
      } else {
        await dao.battle.updateBattle(this._db, battleId, {
          battle_start: battle.start,
          battle_end: battle.end,
          battle_data: data,
        })
      }
      await dao.battle.setAssociatedKillmails(
          this._db, battleId, data.killmails);
    }
    callback();
  }
}
