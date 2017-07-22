import Promise = require('bluebird');
import moment = require('moment');

import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { JobTracker, ExecutorResult } from '../Job';


export function truncateCharacterLocations(
    db: Tnex, job: JobTracker): Promise<ExecutorResult> {
  let cutoff = moment().subtract(120, 'days').valueOf();

  return dao.characterLocation.deleteOldLocations(db, cutoff)
  .then(() => {
    return <ExecutorResult>'success';
  });
};
