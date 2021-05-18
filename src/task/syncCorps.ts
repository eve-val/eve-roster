import moment = require("moment");

import { dao } from "../db/dao";
import { Tnex } from "../db/tnex";
import { JobLogger } from "../infra/taskrunner/Job";
import { isAnyEsiError } from "../data-source/esi/error";
import { isMissingCharError } from "../data-source/esi/error";
import { UNKNOWN_CORPORATION_ID } from "../db/constants";
import { CORP_DOOMHEIM } from "../shared/eveConstants";
import { parallelize } from "../util/asyncUtil";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger";
import { Task } from "../infra/taskrunner/Task";
import { ESI_CHARACTERS_$characterId } from "../data-source/esi/endpoints";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi";

const logger = buildLoggerFromFilename(__filename);

export const syncCorps: Task = {
  name: "syncCorps",
  displayName: "Sync corporations",
  description: "Updates all characters' corporations.",
  timeout: moment.duration(20, "minutes").asMilliseconds(),
  executor,
};

function executor(db: Tnex, job: JobLogger) {
  let completedCharacters = 0;

  return Promise.resolve()
    .then(() => {
      return dao.character.getAllCharacterIds(db);
    })
    .then((characterIds) => {
      job.setProgress(0, undefined);

      const esiErrorCharacterIds: number[] = [];

      return parallelize(
        characterIds,
        (characterId, _) => {
          return updateCorporation(db, characterId)
            .catch((e) => {
              if (isAnyEsiError(e)) {
                esiErrorCharacterIds.push(characterId);
              } else {
                throw e;
              }
            })
            .then(() => {
              completedCharacters++;
              job.setProgress(
                completedCharacters / characterIds.length,
                undefined
              );
            });
        },
        3
      ).then(() => {
        if (esiErrorCharacterIds.length > 0) {
          job.warn(`syncCorps got ESI errors for ${esiErrorCharacterIds}.`);
        }
        logger.info(
          `syncCorps successfully synced ${completedCharacters}/` +
            `${characterIds.length} characters.`
        );
      });
    });
}

function updateCorporation(db: Tnex, characterId: number) {
  return Promise.resolve()
    .then(() => {
      return dao.character.updateCharacter(db, characterId, {
        character_corporationId: UNKNOWN_CORPORATION_ID,
      });
    })
    .then(() => {
      return fetchEsi(ESI_CHARACTERS_$characterId, { characterId });
    })
    .then((character) => {
      return dao.character.updateCharacter(db, characterId, {
        character_corporationId: character.corporation_id,
      });
    })
    .catch((e) => {
      if (isMissingCharError(e)) {
        return dao.character.updateCharacter(db, characterId, {
          character_corporationId: CORP_DOOMHEIM,
        });
      } else {
        throw e;
      }
    });
}
