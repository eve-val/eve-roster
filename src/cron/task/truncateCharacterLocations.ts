import moment = require('moment');

import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { JobTracker } from '../Job';


export async function truncateCharacterLocations(db: Tnex, job: JobTracker) {
  let cutoff = moment().subtract(120, 'days').valueOf();

  await dao.characterLocation.deleteOldLocations(db, cutoff)
};
