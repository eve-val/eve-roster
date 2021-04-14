import moment from 'moment';
import { getAccessToken } from '../data-source/accessToken/accessToken';
import { isAnyEsiError } from '../data-source/esi/error';
import { EsiErrorKind } from '../data-source/esi/EsiError';
import { EsiNotification } from '../data-source/esi/EsiNotification';
import { fetchEsi } from '../data-source/esi/fetch/fetchEsi';
import { ESI_CHARACTERS_$characterId_NOTIFICATIONS } from '../data-source/esi/endpoints';
import { dao } from '../db/dao';
import { Tnex } from '../db/tnex';
import { AccessTokenError } from '../error/AccessTokenError';
import { buildLoggerFromFilename } from '../infra/logging/buildLogger';
import { JobLogger } from '../infra/taskrunner/Job';
import { Task } from '../infra/taskrunner/Task';

// If a character was updated less than 10 minutes ago, we consider it
// unnecessary to update that character this time.
const MIN_UPDATE_FREQUENCY_MILLIS = 10 * 60 * 1000;

const logger = buildLoggerFromFilename(__filename);

export const syncNotifications: Task = {
  name: 'syncNotifications',
  displayName: 'Sync Notifications',
  description: "Searches for structure attack notifications in member keys.",
  timeout: moment.duration(1, 'minutes').asMilliseconds(),
  executor,
};

async function findNotifications(
    characterId: number, accessToken: string,
): Promise<EsiNotification[]> {
  return await fetchEsi(
    ESI_CHARACTERS_$characterId_NOTIFICATIONS,
    {
      characterId,
      _token: accessToken,
    }
  );
}

async function updateCharacter(
  db: Tnex,
  characterId: number
) {
  const lastUpdated = await dao.characterNotification.getLastUpdateTimestamp(
    db,
    characterId
  );
  const updateNeededCutoff = new Date().getTime() - MIN_UPDATE_FREQUENCY_MILLIS;
  if (lastUpdated > updateNeededCutoff) {
    return;
  }
  const token = await getAccessToken(db, characterId);
  const messages = await findNotifications(characterId, token);
  await dao.characterNotification.setCharacterNotifications(db, characterId, messages);
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  let characterIds = await dao.roster.getCharacterIdsOwnedByMemberAccounts(
    db
  );

  const start = new Date();
  characterIds = characterIds.filter((characterId) =>
    // Only pull 1/12 of characters every minute; cache refresh is 10 min.
    // This maximizes chance we'll find out about structure hits quickly.
    characterId % 12 == start.getMinutes() % 12
  );

  const len = characterIds.length;
  let progress = 0;
  let errors = 0;
  for (let characterId of characterIds) {
    try {
      await updateCharacter(db, characterId);
    } catch (e) {
      ++errors;
      if (e instanceof AccessTokenError || isAnyEsiError(e)) {
        logger.warn(
          `ESI error while fetching notifications for char ${characterId}.`,
          e
        );
      } else {
        throw e;
      }
    }
    ++progress;
    job.setProgress(progress / len, undefined);
  }

  // Now, check the notifications table for any new notifications since last
  // run, deduped.

  if (errors) {
    job.warn(`Failed to fetch notifications for ${errors}/${len} chars.`);
  }
}
