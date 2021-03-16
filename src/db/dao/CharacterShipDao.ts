import { Dao } from '../dao';
import {
  account,
  character,
  characterShip,
  ownership,
  sdeType,
} from '../tables';
import { Tnex, val } from '../tnex';

export default class CharacterShipDao {
  constructor(private _parent: Dao) {}

  async setCharacterShips(db: Tnex, characterId: number, ships: CharacterShipRow[]) : Promise<void> {
    let items = ships.map((row) => {
      return {
        characterShip_character: characterId,
        characterShip_itemId: row.itemId,
        characterShip_typeId: row.typeId,
        characterShip_name: row.name,
        characterShip_locationDescription: row.locationDescription,
      };
    });

    return db.replace(
      characterShip,
      'characterShip_character',
      characterId,
      items,
    );
  }

  async getBorrowedShips(
    db: Tnex,
    predicates: {
      includeOpsecChars?: boolean
      accountId?: number,
    }
  ) : Promise<BorrowedShipOutputRow[]> {
    let q = db
      .select(characterShip)
      .join(character, 'character_id', '=', 'characterShip_character')
      .join(ownership, 'ownership_character', '=', 'character_id')
      .join(account, 'account_id', '=', 'ownership_account')
      .join(
        db
          .alias(character, 'mainChar')
          .using('character_id', 'mainChar_id')
          .using('character_name', 'mainChar_name'),
        'mainChar_id',
        '=',
        'account_mainCharacter',
      )
      .join(sdeType, 'styp_id', '=', 'characterShip_typeId')
      .columns(
        'mainChar_name',
        'character_name',
        'styp_name',
        'characterShip_name',
        'characterShip_locationDescription',
      );
    if (predicates.accountId !== undefined) {
      q = q.where('account_id', '=', val(predicates.accountId));
    }
    if (!predicates.includeOpsecChars) {
      q = q.where('ownership_opsec', '=', val(false));
    }
    let rows = await q.run();
    return rows.map(
      (r) =>
        <BorrowedShipOutputRow>{
          mainCharacterName: r.mainChar_name,
          characterName: r.character_name,
          type: r.styp_name,
          name: r.characterShip_name,
          locationDescription: r.characterShip_locationDescription,
        },
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
  mainCharacterName: string;
  characterName: string;
  type: string;
  name: string;
  locationDescription: string;
}
