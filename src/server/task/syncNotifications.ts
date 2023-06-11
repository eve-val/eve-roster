import _ from "underscore";
import moment from "moment";
import { getAccessToken } from "../data-source/accessToken/accessToken.js";
import { isAnyEsiError } from "../data-source/esi/error.js";
import { EsiErrorKind } from "../data-source/esi/EsiError.js";
import { EsiNotification } from "../data-source/esi/EsiNotification.js";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi.js";
import { ESI_CHARACTERS_$characterId_NOTIFICATIONS } from "../data-source/esi/endpoints.js";
import { dao } from "../db/dao.js";
import { Tnex } from "../db/tnex/index.js";
import { AccessTokenError } from "../error/AccessTokenError.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { Task } from "../infra/taskrunner/Task.js";

import { trace, context } from "@opentelemetry/api";

// If a character was updated less than 10 minutes ago, we consider it
// unnecessary to update that character this time.
const MAX_UPDATE_FREQUENCY = moment.duration(10, "minutes");
const IMPORTANT_NOTIFICATION_TYPES = [
  "StructureUnderAttack",
  "StructureLostShields",
  "StructureLostArmor",
  "StructureFuelAlert",
  "EntosisCaptureStarted",
  "SovStructureReinforced",
  "OrbitalAttacked",
  "OrbitalReinforced",
  "TowerAlertMsg",
  "TowerResourceAlertMsg",
];

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));
const tracer = trace.getTracer(fileURLToPath(import.meta.url));

export const syncNotifications: Task = {
  name: "syncNotifications",
  displayName: "Sync Notifications",
  description: "Searches for structure attack notifications in member keys.",
  timeout: moment.duration(1, "minutes").asMilliseconds(),
  executor,
};

async function findNotifications(
  characterId: number,
  accessToken: string
): Promise<EsiNotification[]> {
  return await fetchEsi(ESI_CHARACTERS_$characterId_NOTIFICATIONS, {
    characterId,
    _token: accessToken,
  });
}

async function updateCharacter(db: Tnex, characterId: number) {
  const lastUpdated = await dao.characterNotification.getLastUpdateTimestamp(
    db,
    characterId
  );
  const updateNeededCutoff = moment().subtract(MAX_UPDATE_FREQUENCY);
  if (lastUpdated.isAfter(updateNeededCutoff)) {
    return;
  }
  const token = await getAccessToken(db, characterId);
  const messages = await findNotifications(characterId, token);
  await dao.characterNotification.setCharacterNotifications(
    db,
    characterId,
    messages
  );
}

async function executor(db: Tnex, job: JobLogger) {
  job.setProgress(0, undefined);
  const tokens =
    await dao.characterLocation.getMemberCharactersWithValidAccessTokens(db);

  const start = moment();
  const characterIds = _.pluck(tokens, "accessToken_character").filter(
    (characterId) =>
      // Only pull 1/12 of characters every minute; cache refresh is 10 min.
      // This maximizes chance we'll find out about structure hits quickly.
      characterId % 12 == start.minute() % 12
  );

  const len = characterIds.length;
  let progress = 0;
  let errors = 0;
  const promises = characterIds.map(async (characterId) => {
    const span = tracer.startSpan("updateCharacterNotifications");
    span.setAttribute("characterId", characterId);
    await context.with(trace.setSpan(context.active(), span), async () => {
      try {
        await updateCharacter(db, characterId);
      } catch (e) {
        if (e instanceof AccessTokenError) {
          logger.info(
            `Access token error while fetching notifications for char ${characterId}.`,
            e
          );
        } else if (isAnyEsiError(e)) {
          if (e.kind == EsiErrorKind.FORBIDDEN_ERROR) {
            logger.info(
              `Marking access token as expired for char ${characterId} due to 403.`
            );
            dao.accessToken.markAsExpired(db, characterId);
          }
          ++errors;
          logger.warn(
            `ESI error while fetching notifications for char ${characterId}.`,
            e
          );
        } else {
          ++errors;
          throw e;
        }
      } finally {
        ++progress;
        job.setProgress(progress / len, undefined);
        span.end();
      }
    });
  });
  await Promise.all(promises);

  // Now, check the notifications table for any new notifications since last
  // run, deduped.
  const since = start.clone().subtract(MAX_UPDATE_FREQUENCY);
  const deduped = await dao.characterNotification.getRecentStructurePings(
    db,
    since,
    IMPORTANT_NOTIFICATION_TYPES
  );
  const span = trace.getSpan(context.active());
  for (const msg of deduped) {
    span?.addEvent("notification", await msg);
  }

  if (errors) {
    job.warn(`Failed to fetch notifications for ${errors}/${len} chars.`);
  }
}
