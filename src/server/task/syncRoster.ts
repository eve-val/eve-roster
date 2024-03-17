import moment from "moment";

import { Tnex, val, UpdatePolicy } from "../db/tnex/index.js";
import { character, Character } from "../db/tables.js";
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
import { AsyncReturnType } from "../../shared/util/simpleTypes.js";
import { updateGroupsOnAllAccounts } from "../domain/account/accountGroups.js";
import { Task } from "../infra/taskrunner/Task.js";
import { fetchEsi } from "../data-source/esi/fetch/fetchEsi.js";
import { EsiScope } from "../data-source/esi/EsiScope.js";
import { errorMessage } from "../util/error.js";
import { EsiEntity, esiCorp } from "../data-source/esi/EsiEntity.js";
import { inspect } from "util";
import { tryAsDirector } from "../data-source/accessToken/runAsDirector.js";
import { Result } from "../util/Result.js";

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
    const corp = esiCorp(row.mcorp_corporationId, row.mcorp_name);
    const result = await syncCorporation(db, job, corp);

    if (result.isSuccess()) {
      job.info(`Synced ${result.value} characters for corp ${corp}`);
      results.push({
        corporation: corp,
        status: "success",
        characterCount: result.value,
      });
    } else {
      job.error(
        `Error while syncing corp ${corp}: ${errorMessage(result.error)}`,
      );
      results.push({
        corporation: corp,
        status: "failure",
        characterCount: 0,
      });
    }
  }
  await updateGroupsOnAllAccounts(db);

  job.info(`Finished syncing roster:\n${inspect(results)}`);
}

async function syncCorporation(
  db: Tnex,
  job: JobLogger,
  corp: EsiEntity,
): Promise<Result<number>> {
  job.info(`syncCorporation ${corp}`);

  const scopes = [
    EsiScope.CORP_READ_MEMBERSHIP,
    EsiScope.CORP_READ_TITLES,
    EsiScope.CORP_TRACK_MEMBERS,
  ];

  return await tryAsDirector(db, job, corp, scopes, (token, director) => {
    job.info(`Using ${director} to sync roster for ${corp}...`);
    return updateMemberList(db, job, corp.id, token);
  });
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
  token: string,
) {
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
