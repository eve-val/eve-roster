import Bluebird = require("bluebird");
import moment = require("moment");

import { dao } from "../db/dao";
import { Tnex } from "../db/tnex";
import { JobLogger } from "../infra/taskrunner/Job";
import { updateSkills } from "../domain/skills/skills";
import { AccessTokenError } from "../error/AccessTokenError";
import { isAnyEsiError } from "../data-source/esi/error";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger";
import { Task } from "../infra/taskrunner/Task";

const logger = buildLoggerFromFilename(__filename);

export const syncSkills: Task = {
  name: "syncSkills",
  displayName: "Sync skills",
  description: "Updates all members' skillsheets.",
  timeout: moment.duration(30, "minutes").asMilliseconds(),
  executor,
};

function executor(db: Tnex, job: JobLogger) {
  return Promise.resolve()
    .then(() => {
      return dao.roster.getCharacterIdsOwnedByMemberAccounts(db);
    })
    .then((characterIds) => {
      job.setProgress(0, undefined);

      let successCount = 0;
      let esiFailureCount = 0;
      let accessTokenFailureCount = 0;

      return Bluebird.each(characterIds, (characterId, i, len) => {
        return updateSkills(db, characterId)
          .then(() => {
            successCount++;
          })
          .catch((e) => {
            if (e instanceof AccessTokenError) {
              // No access token for this character (or token has expired). This
              // can occur naturally due to unclaimed characters or revoked tokens
              // (or CPP bugs). We can't do anything without one, so skip this
              // character.
              accessTokenFailureCount++;
            } else if (isAnyEsiError(e)) {
              esiFailureCount++;
              logger.warn(
                `ESI error while fetching skills for char ${characterId}.`,
                e
              );
            } else {
              throw e;
            }
          })
          .then(() => {
            job.setProgress(i / len, undefined);
          });
      }).then(() => {
        logger.info(
          `syncSkills updated ${successCount}/${characterIds.length} ` +
            `characters' skills.`
        );
        const errorCount = characterIds.length - successCount;
        if (errorCount > 0) {
          job.warn(
            `Failed to update ${errorCount}/${characterIds.length}` +
              ` characters' skills {${esiFailureCount} ESI errors,` +
              ` ${accessTokenFailureCount} access token errors.`
          );
        }
      });
    });
}
