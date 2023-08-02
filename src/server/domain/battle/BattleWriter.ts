import { BattleResult } from "./BattleCreator.js";
import { Tnex, DEFAULT_NUM } from "../../db/tnex/index.js";
import { dao } from "../../db/dao.js";
import { BattleData } from "../../../shared/types/srp/battle/BattleData.js";
import { Writable } from "../../util/stream/Writable.js";
import { BasicCallback } from "../../util/stream/core.js";

/**
 * Writes the output of BattleCreator to the database.
 */
export class BattleWriter extends Writable<BattleResult> {
  private readonly _db: Tnex;
  private _newBattleCount = 0;

  constructor(db: Tnex) {
    super({
      objectMode: true,
    });
    this._db = db;
  }

  public getNewBattleCount() {
    return this._newBattleCount;
  }

  _write(chunk: BattleResult, encoding: string, callback: BasicCallback) {
    this._writeBattle(chunk, callback).catch((err) => {
      this.emit("error", err);
    });
  }

  private async _writeBattle(
    result: BattleResult,
    callback: (err?: Error) => void,
  ) {
    if (result.type == "deleted") {
      await dao.battle.deleteBattle(this._db, result.battleId);
    } else {
      const battle = result.battle;
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
        });
      }
      await dao.battle.setAssociatedKillmails(
        this._db,
        battleId,
        data.killmails,
      );
      this._newBattleCount++;
    }
    callback();
  }
}
