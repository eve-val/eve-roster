import { Tnex } from "../../db/tnex/index";
import { Dao } from "../dao";
import { MEMBER_GROUP } from "../../domain/account/specialGroups";

export interface SkillRequirement {
  skill: number;
  minLevel: number;
}

export default class SkillQueueDao {
  constructor(private _parent: Dao) {}

  getTrainedPercentage(db: Tnex, requirements: SkillRequirement[]) {
    // The for-loop dynamism below means that we have to use the raw knex
    // interface instead of Tnex :(

    const knex = db.knex();

    let query = knex("account")
      .select(
        "mainCharacter.id as id",
        "mainCharacter.name as name",
        "characterCombatStats.killsInLastMonth as kills"
      )
      .join(
        // Subselect: all member accounts
        knex
          .select("account.id")
          .from("account")
          .join("accountGroup", "accountGroup.account", "=", "account.id")
          .where("accountGroup.group", "=", MEMBER_GROUP)
          .as("memberAccount"),
        "memberAccount.id",
        "=",
        "account.id"
      )
      .join("ownership", "ownership.account", "=", "account.id")
      .join("character", "character.id", "=", "ownership.character")
      .join(
        "character as mainCharacter",
        "mainCharacter.id",
        "=",
        "account.mainCharacter"
      )
      .join(
        "characterCombatStats",
        "characterCombatStats.character",
        "=",
        "mainCharacter.id"
      )
      .distinct("account.id")
      .orderBy("characterCombatStats.killsInLastMonth", "desc");

    for (let i = 0; i < requirements.length; i++) {
      const r = requirements[i];
      const alias = `ss${i}`;

      query = query
        .join(
          `skillsheet as ${alias}`,
          `${alias}.character`,
          "=",
          "character.id"
        )
        .where(`${alias}.skill`, "=", r.skill)
        .where(`${alias}.level`, ">=", r.minLevel);
    }

    return query;
  }
}
