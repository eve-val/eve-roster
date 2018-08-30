import moment = require('moment');

import { Tnex } from '../tnex';
import { dao } from '../db/dao';
import { JobLogger } from '../infra/taskrunner/Job';


export async function truncateCharacterLocations(db: Tnex, job: JobLogger) {
  let cutoff = moment().subtract(120, 'days').valueOf();

  await dao.characterLocation.deleteOldLocations(db, cutoff)
};
