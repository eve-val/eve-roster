import moment = require('moment');

import { Tnex, val, UpdatePolicy } from '../../tnex';
import { character, accessToken, Character, MemberCorporation } from '../../db/tables';
import { getAccessToken } from '../../data-source/accessToken/accessToken';
import { dao } from '../../db/dao';
import { arrayToMap, refine } from '../../util/collections';
import { JobLogger } from '../Job';
import { fetchEveNames } from '../../eve/esi/names';
import { UNKNOWN_CORPORATION_ID } from '../../db/constants';
import { fetchEndpoint } from '../../eve/esi/fetchEndpoint';
import { ESI_CORPORATIONS_$corporationId_MEMBERS, ESI_CORPORATIONS_$corporationId_TITLES, ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES, ESI_CORPORATIONS_$corporationId_ROLES, ESI_CORPORATIONS_$corporationId_MEMBERTRACKING } from '../../eve/esi/endpoints';
import { isAnyEsiError, printError } from '../../eve/esi/error';
import { hasRosterScopes } from '../../domain/roster/hasRosterScopes';
import { AccessTokenError } from '../../error/AccessTokenError';
import { AsyncReturnType } from '../../util/simpleTypes';
import { updateGroupsOnAllAccounts } from '../../domain/account/accountGroups';
import { LogLevel } from '../../logs/Logger';

/**
 * Updates the member list of each member corporation.
 */
export async function syncRoster(db: Tnex, job: JobLogger) {
  const memberRows = await dao.config.getMemberCorporations(db);

  for (let row of memberRows) {
    await syncCorporation(db, job, row);
  }
  await updateGroupsOnAllAccounts(db);
}

async function syncCorporation(
    db: Tnex, job: JobLogger, corporation: MemberCorporation) {
  const corpId = corporation.memberCorporation_corporationId;
  const errorLevel = corporation.memberCorporation_membership == 'full'
      ? LogLevel.ERROR : LogLevel.WARN;
  job.info(`syncCorporation ${corpId}`);

  const directorRows = await dao.roster.getCorpDirectors(db, corpId);

  let updateSuccessful = false;

  for (let row of directorRows) {
    if (row.accessToken_needsUpdate) {
      job.info(`Skipping director ${row.character_id}/${row.character_name}`
          + ` (access token has expired).`);
      continue;
    }
    if (!hasRosterScopes(row.accessToken_scopes)) {
      job.info(`Skipping director ${row.character_id}/${row.character_name}`
          + ` (insufficient token scopes).`);
      continue;
    }
    try {
      await updateMemberList(db, job, corpId, row.character_id);
      updateSuccessful = true;
      break;
    } catch (e) {
      if (isAnyEsiError(e) || e instanceof AccessTokenError) {
        job.warn(`ESI error while syncing via director ${row.character_name}:`);
        job.warn(printError(e));
      } else {
        job.error(
          `Unexpected failure while trying to sync corp ${corpId} using `
              + `char ${row.character_name}'s token.`);
        job.error(e.toString());

        // These kinds of errors are unexpected: bail on the rest of the roster
        // sync.
        break;
      }
    }
  }

  if (directorRows.length == 0) {
    job.log(errorLevel, `No known directors for corporation ${corpId}.`)
  }

  if (!updateSuccessful) {
    job.log(
        errorLevel, `Roster sync failed for primary corporation ${corpId}.`);
  }

  job.info(`Sync ${corpId} complete.`);
}

async function updateMemberList(
    db: Tnex, job: JobLogger, corporationId: number, director: number) {

  const token = await getAccessToken(db, director);
  const [memberIds, titleDefs, memberTitles, memberRoles, memberTracking] = await Promise.all([
    fetchEndpoint(
        ESI_CORPORATIONS_$corporationId_MEMBERS, { corporationId }, token),
    fetchEndpoint(
        ESI_CORPORATIONS_$corporationId_TITLES, { corporationId }, token),
    fetchEndpoint(
        ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES,
        { corporationId },
        token),
    fetchEndpoint(
        ESI_CORPORATIONS_$corporationId_ROLES, { corporationId }, token),
    fetchEndpoint(
        ESI_CORPORATIONS_$corporationId_MEMBERTRACKING,
        { corporationId },
        token),
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
      names);

  await db.asyncTransaction(async db => {
    // First, set all of our existing corp characters to having an UNKNOWN corp
    await db
        .update(character, {
          character_corporationId: UNKNOWN_CORPORATION_ID,
          character_roles: [],
          character_titles: null,
        })
        .where('character_corporationId', '=', val(corporationId))
        .run();

    // Then, change all members still on the roles back to being correct
    await db
        .upsertAll(character, rows, 'character_id', {
          character_siggyScore: UpdatePolicy.PRESERVE_EXISTING,
        });
  });

  job.info(`Synced ${rows.length} characters.`);
}

function buildMemberRows(
  job: JobLogger,
  corporationId: number,
  memberIds: typeof ESI_CORPORATIONS_$corporationId_MEMBERS['response'],
  titleDefs: typeof ESI_CORPORATIONS_$corporationId_TITLES['response'],
  memberTitles:
      typeof ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES['response'],
  memberRoles: typeof ESI_CORPORATIONS_$corporationId_ROLES['response'],
  memberTracking:
      typeof ESI_CORPORATIONS_$corporationId_MEMBERTRACKING['response'],
  names: AsyncReturnType<typeof fetchEveNames>,
) {
  const titleDefMap = arrayToMap(titleDefs, 'title_id');

  const outRows = new Map<number, Character>();

  for (let memberId of memberIds) {
    const name = names[memberId];
    if (name == undefined) {
      job.error(`No name for member ${memberId}, skipping...`)
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

  for (let roleList of memberRoles) {
    const row = outRows.get(roleList.character_id);
    if (row && roleList.roles) {
      row.character_roles = roleList.roles;
    }
  }

  for (let titleList of memberTitles) {
    const row = outRows.get(titleList.character_id);
    if (row) {
      row.character_titles = refine(titleList.titles, title => {
        const entry = titleDefMap.get(title);
        return entry && entry.name;
      });
    }
  }

  for (let trackingInfo of memberTracking) {
    const row = outRows.get(trackingInfo.character_id);
    if (row != undefined) {
      row.character_startDate =
          moment.utc(trackingInfo.start_date).valueOf();
      row.character_logonDate =
          moment.utc(trackingInfo.logon_date).valueOf();
      row.character_logoffDate =
          moment.utc(trackingInfo.logoff_date).valueOf();
    }
  }

  return Array.from(outRows.values());
}

