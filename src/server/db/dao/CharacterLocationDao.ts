import { Dao } from "../dao.js";
import { Tnex, val } from "../../db/tnex/index.js";
import {
  characterLocation,
  CharacterLocation,
  memberCorporation,
  character,
} from "../tables.js";

export default class LocationDao {
  constructor(private _parent: Dao) {}

  getMostRecentMemberCharacterLocations(db: Tnex) {
    return db
      .select(memberCorporation)
      .join(character, "character_corporationId", "=", "mcorp_corporationId")
      .join(characterLocation, "charloc_character", "=", "character_id")
      .distinctOn("charloc_character")
      .orderBy("charloc_character", "desc")
      .orderBy("charloc_timestamp", "desc")
      .columns(
        "charloc_shipTypeId",
        "charloc_shipItemId",
        "charloc_shipName",
        "charloc_solarSystemId",
        "charloc_timestamp",
      )
      .run();
  }

  storeAll(db: Tnex, rows: CharacterLocation[]) {
    return db.insertAll(characterLocation, rows);
  }

  deleteOldLocations(db: Tnex, cutoff: number) {
    return db
      .del(characterLocation)
      .where("charloc_timestamp", "<", val(cutoff))
      .run();
  }
}
