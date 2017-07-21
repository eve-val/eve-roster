import Promise = require('bluebird');
import moment = require('moment');

import { db as rootDb } from '../../db';
import { Tnex } from '../../tnex';
import { dao } from '../../dao';
import { ExecutorResult } from '../Job';


export function truncateLocations(): Promise<ExecutorResult> {
  let cutoff = moment().subtract(90, 'days').valueOf();

  return dao.location.deleteOldLocations(rootDb, cutoff)
  .then(() => {
    return <ExecutorResult>'success';
  });
};
