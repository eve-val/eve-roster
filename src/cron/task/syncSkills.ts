import Promise = require('bluebird');

import { dao } from '../../dao';
import { Tnex } from '../../tnex';
import { JobTracker } from '../Job';
import { updateSkills } from '../../data-source/skills';
import { AccessTokenError } from '../../error/AccessTokenError';
import { isAnyEsiError } from '../../util/error';

const logger = require('../../util/logger')(__filename);


export function syncSkills(db: Tnex, job: JobTracker): Promise<void> {
  
  return dao.roster.getCharacterIdsOwnedByMemberAccounts(db)
  .then(characterIds => {
    job.setProgress(0, undefined);

    let successCount = 0;

    return Promise.each(characterIds, (characterId, i, len) => {
      return updateSkills(db, characterId)
      .then(() => {
        successCount++;
      })
      .catch(AccessTokenError, e => {
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
      let errorCount = characterIds.length - successCount;
      if (errorCount > 0) {
        job.warn(`Failed to update ${errorCount}/${characterIds.length}`
            + ` characters' skills.`);
      }
    })
  });
}
