import moment from "moment";

import { Tnex, val, UpdatePolicy } from "../db/tnex/index.js";
import { character, Character, MemberCorporation } from "../db/tables.js";
import { fetchAccessToken } from "../data-source/accessToken/accessToken.js";
import { dao } from "../db/dao.js";
import { arrayToMap, refine } from "../../shared/util/collections.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { fetchEveNames } from "../data-source/esi/names.js";
import { UNKNOWN_CORPORATION_ID } from "../db/constants.js";
import {
  ESI_CORPORATIONS_$corporationId_MEMBERS,
  ESI_CORPORATIONS_$corporationId_TITLES,
  ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES,
  ESI_CORPORATIONS_$corporationId_ROLES,
  ESI_CORPORATIONS_$corporationId_MEMBERTRACKING,
} from "../data-source/esi/endpoints.js";
import { isAnyEsiError } from "../data-source/esi/error.js";
import { hasRosterScopes } from "../domain/roster/hasRosterScopes.js";
import { AccessTokenError } from "../data-source/accessToken/AccessTokenResult.js";
import { AsyncReturnType } from "../../shared/util/simpleTypes.js";
import { updateGroupsOnAllAccounts } from "../domain/account/accountGroups.js";
import { LogLevel } from "../infra/logging/Logger.js";
import { Task } from "../infra/taskrunner/Task.js";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi.js";
import { EsiScope } from "../data-source/esi/EsiScope.js";
import { errorMessage } from "../util/error.js";
import { EsiEntity } from "../data-source/esi/EsiEntity.js";
import { inspect } from "util";

/**
 * Updates the member list of each member corporation.
 */
export const syncRoster: Task = {
  name: "syncRoster",
  displayName: "Sync roster",
  description: "Updates the list of corporation members.",
  timeout: moment.duration(5, "minutes").asMilliseconds(),
  executor,
};

async function executor(db: Tnex, job: JobLogger) {
  const memberRows = await dao.config.getMemberCorporations(db);

  const results: CorpSyncResult[] = [];
  for (const row of memberRows) {
    const result = await syncCorporation(db, job, row);
    results.push(result);
  }
  await updateGroupsOnAllAccounts(db);

  job.info(`Finished syncing roster:\n${inspect(results)}`);
}

async function syncCorporation(
  db: Tnex,
  job: JobLogger,
  corpRow: MemberCorporation,
): Promise<CorpSyncResult> {
  const corp = new EsiEntity(corpRow.mcorp_corporationId, corpRow.mcorp_name);
  const errorLevel =
    corpRow.mcorp_membership == "full" ? LogLevel.ERROR : LogLevel.WARN;
  job.info(`syncCorporation ${corp}`);

  const directorRows = await dao.roster.getCorpDirectors(db, corp.id);

  let updateSuccessful = false;
  let characterCount = 0;

  for (const row of directorRows) {
    const director = new EsiEntity(row.character_id, row.character_name);
    if (row.accessToken_needsUpdate) {
      job.info(`Skipping director ${director} (access token has expired).`);
      continue;
    }
    if (!hasRosterScopes(row.accessToken_scopes)) {
      job.info(`Skipping director ${director} (insufficient token scopes).`);
      continue;
    }
    try {
      characterCount = await updateMemberList(
        db,
        job,
        corp.id,
        row.character_id,
      );
      updateSuccessful = true;
      break;
    } catch (e) {
      if (!(e instanceof Error)) {
        throw e;
      }
      if (isAnyEsiError(e)) {
        job.warn(`ESI error while syncing via director ${director}:`);
        job.warn(errorMessage(e));
      } else if (e instanceof AccessTokenError) {
        job.info(
          `Token error while syncing via director ${director}: ${e.message}`,
        );
      } else {
        job.error(
          `Unexpected failure while trying to sync corp ${corp} using` +
            ` ${director}'s token.`,
        );
        job.error(e.toString());

        // These kinds of errors are unexpected: bail on the rest of the roster
        // sync.
        break;
      }
    }
  }

  if (directorRows.length == 0) {
    job.log(errorLevel, `No known directors for corporation ${corp}.`);
  }

  if (!updateSuccessful) {
    job.log(errorLevel, `Roster sync failed for corporation ${corp}.`);
  }

  job.info(`Sync ${corp} complete.`);

  return {
    corporation: corp,
    status: updateSuccessful ? "success" : "failure",
    characterCount,
  };
}

interface CorpSyncResult {
  corporation: EsiEntity;
  status: "success" | "failure";
  characterCount: number;
}

async function updateMemberList(
  db: Tnex,
  job: JobLogger,
  corporationId: number,
  director: number,
) {
  const token = await fetchAccessToken(db, director, [
    EsiScope.CORP_READ_MEMBERSHIP,
    EsiScope.CORP_READ_TITLES,
    EsiScope.CORP_TRACK_MEMBERS,
  ]);
  const [memberIds, titleDefs, memberTitles, memberRoles, memberTracking] =
    await Promise.all([
      fetchEsi(ESI_CORPORATIONS_$corporationId_MEMBERS, {
        corporationId,
        _token: token,
      }),
      fetchEsi(ESI_CORPORATIONS_$corporationId_TITLES, {
        corporationId,
        _token: token,
      }),
      fetchEsi(ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES, {
        corporationId,
        _token: token,
      }),
      fetchEsi(ESI_CORPORATIONS_$corporationId_ROLES, {
        corporationId,
        _token: token,
      }),
      fetchEsi(ESI_CORPORATIONS_$corporationId_MEMBERTRACKING, {
        corporationId,
        _token: token,
      }),
    ]);
  const names = await fetchEveNames(memberIds);

  const rows = buildMemberRows(
    job,
    corporationId,
    memberIds,
    titleDefs,
    memberTitles,
    memberRoles,
    memberTracking,
    names,
  );

  await db.asyncTransaction(async (db) => {
    // First, set all of our existing corp characters to having an UNKNOWN corp
    await db
      .update(character, {
        character_corporationId: UNKNOWN_CORPORATION_ID,
        character_roles: [],
        character_titles: null,
      })
      .where("character_corporationId", "=", val(corporationId))
      .run();

    // Then, change all members still on the roles back to being correct
    await db.upsertAll(character, rows, "character_id", {
      character_siggyScore: UpdatePolicy.PRESERVE_EXISTING,
    });
  });

  job.info(`Synced ${rows.length} characters.`);

  return rows.length;
}

function buildMemberRows(
  job: JobLogger,
  corporationId: number,
  memberIds: (typeof ESI_CORPORATIONS_$corporationId_MEMBERS)["response"],
  titleDefs: (typeof ESI_CORPORATIONS_$corporationId_TITLES)["response"],
  memberTitles: (typeof ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES)["response"],
  memberRoles: (typeof ESI_CORPORATIONS_$corporationId_ROLES)["response"],
  memberTracking: (typeof ESI_CORPORATIONS_$corporationId_MEMBERTRACKING)["response"],
  names: AsyncReturnType<typeof fetchEveNames>,
) {
  const titleDefMap = arrayToMap(titleDefs, "title_id");

  const outRows = new Map<number, Character>();

  for (const memberId of memberIds) {
    const name = names[memberId];
    if (name == undefined) {
      job.error(`No name for member ${memberId}, skipping...`);
      continue;
    }

    outRows.set(memberId, {
      character_id: memberId,
      character_name: name,
      character_corporationId: corporationId,
      character_roles: [],
      character_titles: [],
      character_deleted: false,
      character_startDate: null,
      character_logoffDate: null,
      character_logonDate: null,
      character_siggyScore: null,
    });
  }

  for (const roleList of memberRoles) {
    const row = outRows.get(roleList.character_id);
    if (row && roleList.roles) {
      row.character_roles = roleList.roles;
    }
  }

  for (const titleList of memberTitles) {
    const row = outRows.get(titleList.character_id);
    if (row) {
      row.character_titles = refine(titleList.titles, (title) => {
        const entry = titleDefMap.get(title);
        return entry?.name;
      });
    }
  }

  for (const trackingInfo of memberTracking) {
    const row = outRows.get(trackingInfo.character_id);
    if (row != undefined) {
      row.character_startDate = moment.utc(trackingInfo.start_date).valueOf();
      row.character_logonDate = moment.utc(trackingInfo.logon_date).valueOf();
      row.character_logoffDate = moment.utc(trackingInfo.logoff_date).valueOf();
    }
  }

  return Array.from(outRows.values());
}
