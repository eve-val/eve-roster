import { Dao } from "../dao.js";
import {
  account,
  character,
  characterShip,
  characterShipUpdate,
  ownership,
  sdeType,
} from "../tables.js";
import { Tnex, val } from "../tnex/index.js";

export default class CharacterShipDao {
  constructor(private _parent: Dao) {}

  async setCharacterShips(
    db: Tnex,
    characterId: number,
    ships: CharacterShipRow[],
  ): Promise<void> {
    const items = ships.map((row) => {
      return {
        characterShip_character: characterId,
        characterShip_itemId: row.itemId,
        characterShip_typeId: row.typeId,
        characterShip_name: row.name,
        characterShip_locationDescription: row.locationDescription,
      };
    });

    return db.transaction(async (db) => {
      await db.upsert(
        characterShipUpdate,
        {
          characterShipUpdate_character: characterId,
          characterShipUpdate_timestamp: Date.now(),
        },
        "characterShipUpdate_character",
      );
      await db
        .del(characterShip)
        .where("characterShip_character", "=", val(characterId))
        .run();
      await db.insertAll(characterShip, items);
    });
  }

  async getLastUpdateTimestamp(db: Tnex, characterId: number): Promise<number> {
    const timestamp = await db
      .select(characterShipUpdate)
      .where("characterShipUpdate_character", "=", val(characterId))
      .columns("characterShipUpdate_timestamp")
      .fetchFirst();
    return timestamp?.characterShipUpdate_timestamp || 0;
  }

  async getBorrowedShips(
    db: Tnex,
    predicates: {
      includeOpsecChars?: boolean;
      accountId?: number;
    },
  ): Promise<BorrowedShipOutputRow[]> {
    let q = db
      .select(characterShip)
      .join(
        characterShipUpdate,
        "characterShipUpdate_character",
        "=",
        "characterShip_character",
      )
      .join(character, "character_id", "=", "characterShip_character")
      .join(ownership, "ownership_character", "=", "character_id")
      .join(account, "account_id", "=", "ownership_account")
      .join(
        db
          .alias(character, "mainChar")
          .using("character_id", "mainChar_id")
          .using("character_name", "mainChar_name"),
        "mainChar_id",
        "=",
        "account_mainCharacter",
      )
      .join(sdeType, "styp_id", "=", "characterShip_typeId")
      .columns(
        "mainChar_name",
        "character_name",
        "styp_name",
        "characterShip_id",
        "characterShip_name",
        "characterShip_locationDescription",
        "characterShipUpdate_timestamp",
      );
    if (predicates.accountId !== undefined) {
      q = q.where("account_id", "=", val(predicates.accountId));
    }
    if (!predicates.includeOpsecChars) {
      q = q.where("ownership_opsec", "=", val(false));
    }
    const rows = await q.run();
    return rows.map(
      (r) =>
        ({
          id: r.characterShip_id,
          mainCharacterName: r.mainChar_name,
          characterName: r.character_name,
          type: r.styp_name,
          name: r.characterShip_name,
          locationDescription: r.characterShip_locationDescription,
          timestamp: r.characterShipUpdate_timestamp,
        }) as BorrowedShipOutputRow,
    );
  }
}

export interface CharacterShipRow {
  characterId: number;
  itemId: number;
  typeId: number;
  name: string;
  locationDescription: string;
}

export interface BorrowedShipOutputRow {
  id: number;
  mainCharacterName: string;
  characterName: string;
  type: string;
  name: string;
  locationDescription: string;
  timestamp: number;
}
