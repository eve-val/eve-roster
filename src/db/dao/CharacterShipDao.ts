import { Dao } from '../dao';
import { characterShip } from '../tables';
import { Tnex } from '../tnex';

export default class CharacterShipDao {
  constructor(private _parent: Dao) {}

  setCharacterShips(db: Tnex, characterId: number, ships: CharacterShipRow[]) {
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
}

export interface CharacterShipRow {
  characterId: number;
  itemId: number;
  typeId: number;
  name: string;
  locationDescription: string;
}
