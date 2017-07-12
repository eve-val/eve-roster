import Promise = require('bluebird');

import { db as rootDb } from '../../db';
import { dao } from '../../dao';
import { Tnex } from '../../tnex';
import { JobTracker, ExecutorResult } from '../Job';
import { updateSkills } from '../../data-source/skills';
import { MissingTokenError } from '../../error/MissingTokenError';
import { isAnyEsiError } from '../../util/error';

const logger = require('../../util/logger')(__filename);


export function syncSkills(job: JobTracker): Promise<ExecutorResult> {
  
  return dao.roster.getCharacterIdsOwnedByMemberAccounts(rootDb)
  .then(characterIds => {
    job.setProgress(0, undefined);

    let successCount = 0;

    return Promise.each(characterIds, (characterId, i, len) => {
      return updateSkills(rootDb, characterId)
      .then(() => {
        successCount++;
      })
      .catch(MissingTokenError, e => {
        logger.warn(`Missing access token for character ${characterId}, ` +
            `skipping...`);
      })
      .catch(isAnyEsiError, e => {
        logger.warn(`ESI error while fetching skills for char ${characterId}.`);
        logger.warn(e);
      })
      .catch(e => {
        logger.error(`Error while fetching skills for char ${characterId}.`);
        logger.error(e);
        if (e.response) {
          logger.error(e.response.status);
          logger.error(e.response.data);
          logger.error(e.response.headers);
        }
      })
      .then(() => {
        job.setProgress(i / len, undefined);
      });
    })
    .then(() => {
      logger.info(`syncSkills updated ${successCount}/${characterIds.length} ` +
          `characters' skills.`);
    })
  })
  .then((): ExecutorResult => {
    return 'success';
  });
}
