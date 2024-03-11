import moment from "moment";

import { fetchAccessTokens } from "../data-source/accessToken/accessToken.js";
import { dao } from "../db/dao.js";
import { Tnex } from "../db/tnex/index.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { CharacterLocation } from "../db/tables.js";
import { Task } from "../infra/taskrunner/Task.js";
import {
  ESI_CHARACTERS_$characterId_LOCATION,
  ESI_CHARACTERS_$characterId_SHIP,
} from "../data-source/esi/endpoints.js";
import { isAnyEsiError } from "../data-source/esi/error.js";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi.js";
import { EsiScope } from "../data-source/esi/EsiScope.js";
import {
  TokenResultType,
  accessTokenResultToString,
} from "../data-source/accessToken/AccessTokenResult.js";

export const syncCharacterLocations: Task = {
  name: "syncCharacterLocations",
  displayName: "Sync locations",
  description: "Updates all members' locations.",
  timeout: moment.duration(10, "minutes").asMilliseconds(),
  executor,
};

const SLOW_UPDATE_THRESHOLD = moment.duration(30, "days").asMilliseconds();
const RAPID_UPDATE_THRESHOLD = moment.duration(6, "hours").asMilliseconds();

const CHARLOC_CACHE = new Map<number, CharacterLocation>();

async function executor(db: Tnex, job: JobLogger) {
  if (CHARLOC_CACHE.size == 0) {
    await fillLocationCache(db);
  }

  const characterIds = (
    await dao.roster.getMemberCharactersWithValidAccessTokens(db)
  ).map((row) => row.character_id);
  const tokenMap = await fetchAccessTokens(db, characterIds, [
    EsiScope.READ_LOCATION,
    EsiScope.READ_SHIP_TYPE,
  ]);
  const esiErrors: [number, string][] = [];

  const tasks: Promise<CharacterLocation | null>[] = [];
  for (const characterId of characterIds) {
    const tokenResult = tokenMap.get(characterId)!;
    if (tokenResult.kind != TokenResultType.SUCCESS) {
      switch (tokenResult.kind) {
        case TokenResultType.MISSING_SCOPES:
        case TokenResultType.TOKEN_INVALID:
          // This is to be expected for some members, just ignore
          break;
        default:
          job.warn(
            `Error while refreshing token for ${characterId}: ` +
              accessTokenResultToString(tokenResult),
          );
          break;
      }
      continue;
    }
    if (shouldCheckLocation(characterId)) {
      tasks.push(
        checkLocation(characterId, tokenResult.token).catch((e) => {
          if (isAnyEsiError(e)) {
            esiErrors.push([characterId, e.kind]);
          } else {
            job.error(`Error while updating location for ` + `${characterId}:`);
            job.error(e);
          }
          return null;
        }),
      );
    }
  }

  const results = await Promise.all(tasks);

  const updatedRows: CharacterLocation[] = [];
  for (const result of results) {
    if (result != null) {
      updatedRows.push(result);
    }
  }
  if (updatedRows.length > 0) {
    await dao.characterLocation.storeAll(db, updatedRows);
  }

  if (esiErrors.length > 0) {
    job.info(
      `The following characters got ESI errors: ` +
        esiErrors
          .map(([character, error]) => `${character} (${error})`)
          .join(", "),
    );
  }
}

async function fillLocationCache(db: Tnex) {
  const rows =
    await dao.characterLocation.getMostRecentMemberCharacterLocations(db);

  for (const row of rows) {
    CHARLOC_CACHE.set(row.charloc_character, row);
  }
}

async function checkLocation(characterId: number, accessToken: string) {
  let rowToCommit: CharacterLocation | null = null;

  const cachedRow = CHARLOC_CACHE.get(characterId);
  const newRow = await fetchUpdatedLocationRow(characterId, accessToken);

  if (cachedRow == undefined || !locationsEqual(cachedRow, newRow)) {
    CHARLOC_CACHE.set(characterId, newRow);
    rowToCommit = newRow;
  }

  return rowToCommit;
}

function shouldCheckLocation(characterId: number) {
  const cachedRow = CHARLOC_CACHE.get(characterId);
  if (cachedRow == undefined) {
    return true;
  } else {
    const staleness = Date.now() - cachedRow.charloc_timestamp;
    if (staleness <= RAPID_UPDATE_THRESHOLD) {
      // Normal - always update.
      return true;
    } else if (staleness <= SLOW_UPDATE_THRESHOLD) {
      // 10x slower average polling - do nothing 90% of the time.
      return Math.random() <= 0.1;
    } else {
      // 100x slower average polling - do nothing 99% of the time.
      return Math.random() <= 0.01;
    }
  }
}

function locationsEqual(a: CharacterLocation, b: CharacterLocation) {
  return (
    a.charloc_character == b.charloc_character &&
    a.charloc_shipTypeId == b.charloc_shipTypeId &&
    a.charloc_shipItemId == b.charloc_shipItemId &&
    a.charloc_shipName == b.charloc_shipName &&
    a.charloc_solarSystemId == b.charloc_solarSystemId
  );
}

async function fetchUpdatedLocationRow(
  characterId: number,
  accessToken: string,
): Promise<CharacterLocation> {
  const [locationResults, shipResults] = await Promise.all([
    fetchEsi(ESI_CHARACTERS_$characterId_LOCATION, {
      characterId,
      _token: accessToken,
    }),
    fetchEsi(ESI_CHARACTERS_$characterId_SHIP, {
      characterId,
      _token: accessToken,
    }),
  ]);

  return {
    charloc_character: characterId,
    charloc_timestamp: Date.now(),
    charloc_shipName: shipResults.ship_name,
    charloc_shipTypeId: shipResults.ship_type_id,
    charloc_shipItemId: shipResults.ship_item_id,
    charloc_solarSystemId: locationResults.solar_system_id,
  };
}
