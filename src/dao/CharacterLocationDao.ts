import Promise = require('bluebird');

import { Dao } from '../dao';
import { Tnex, Nullable, toNum, val } from '../tnex';
import { characterLocation, CharacterLocation } from './tables';

export default class LocationDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  put(db: Tnex, locationData: CharacterLocation) {
    return db
      .select(characterLocation)
      .where('charloc_character', '=', val(locationData.charloc_character))
      .orderBy('charloc_timestamp', 'desc')
      .limit(1)
      .columns(
          'charloc_shipName',
          'charloc_shipTypeId',
          'charloc_shipItemId',
          'charloc_solarSystemId',
          'charloc_character',
          'charloc_timestamp',
          )
      .fetchFirst()
      .then((row: CharacterLocation | null) => {
        // Need to compare the actual fields we care about, timestamp changes
        if (!row || locationsDiffer(row, locationData)) {
          return db.insert(characterLocation, locationData);
        }
      });
  }

  deleteOldLocations(db: Tnex, cutoff: number) {
    return db
        .del(characterLocation)
        .where('charloc_timestamp', '<', val(cutoff))
        .run();
  }
}

function locationsDiffer(a: CharacterLocation, b: CharacterLocation) {
  if (a.charloc_shipName != b.charloc_shipName) { return true; }
  if (a.charloc_shipTypeId != b.charloc_shipTypeId) { return true; }
  if (a.charloc_shipItemId != b.charloc_shipItemId) { return true; }
  if (a.charloc_solarSystemId != b.charloc_solarSystemId) { return true; }
  return false;
}
