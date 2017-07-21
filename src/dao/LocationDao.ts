import Promise = require('bluebird');

import { Dao } from '../dao';
import { Tnex, Nullable, toNum, val } from '../tnex';
import { location, Location } from './tables';

export default class LocationDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  put(db: Tnex, locationData: Location) {
    return db
      .select(location)
      .where('location_character', '=', val(locationData.location_character))
      .orderBy('location_timestamp', 'desc')
      .columns('location_shipName',
               'location_shipTypeId',
               'location_shipItemId',
               'location_solarSystemId',
               'location_character',
               'location_timestamp',)
      .fetchFirst()
      .then((row: Location | null) => {
        // Need to compare the actual fields we care about, timestamp changes
        if (!row || locationsDiffer(row, locationData)) {
          return db.insert(location, locationData);
        } else {
          return 0; // no delta, don't insert
        }
      });
  }

  deleteOldLocations(db: Tnex, cutoff: number) {
    return db
        .del(location)
        .where('location_timestamp', '<', val(cutoff))
        .run();
  }
}

function locationsDiffer(a: Location, b: Location) {
  if (a.location_shipName != b.location_shipName) { return true; }
  if (a.location_shipTypeId != b.location_shipTypeId) { return true; }
  if (a.location_shipItemId != b.location_shipItemId) { return true; }
  if (a.location_solarSystemId != b.location_solarSystemId) { return true; }
  return false;
}
