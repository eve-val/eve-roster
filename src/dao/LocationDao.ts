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
    return db.insert(location, locationData);
  }
}
