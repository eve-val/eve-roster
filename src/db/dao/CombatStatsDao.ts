import { Tnex, val } from "../../db/tnex";
import { Dao } from "../dao";
import * as t from "../tables";
import { MEMBER_GROUP } from "../../domain/account/specialGroups";

export default class CombatStatsDao {
  constructor(private _dao: Dao) {}

  getAllCharacterCombatStatsTimestamps(db: Tnex) {
    return db
      .select(t.account)
      .join(t.accountGroup, "accountGroup_account", "=", "account_id")
      .join(t.ownership, "ownership_account", "=", "account_id")
      .join(t.character, "character_id", "=", "ownership_character")
      .leftJoin(t.combatStats, "cstats_character", "=", "character_id")
      .where("accountGroup_group", "=", val(MEMBER_GROUP))
      .andWhere("character_deleted", "=", val(false))
      .columns("character_id", "character_name", "cstats_updated")
      .run();
  }

  updateCharacterCombatStats(
    db: Tnex,
    characterId: number,
    kills: number,
    losses: number,
    killValue: number,
    lossValue: number
  ) {
    return db.upsert(
      t.combatStats,
      {
        cstats_character: characterId,
        cstats_killsInLastMonth: kills,
        cstats_killValueInLastMonth: killValue,
        cstats_lossesInLastMonth: losses,
        cstats_lossValueInLastMonth: lossValue,
        cstats_updated: Date.now(),
      },
      "cstats_character"
    );
  }
}
