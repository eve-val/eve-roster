import moment = require('moment');

import { Tnex } from '../../db/tnex';
import { dao } from '../../db/dao';
import { SimpleNumMap, nil, AsyncReturnType } from '../../util/simpleTypes';
import { SrpLossJson } from '../srp/SrpLossJson';
import { Participant } from './BattleData';
import { arrayToMap, addAll } from '../../util/collections';
import { pluck } from 'underscore';
import { srpLossToJson } from '../srp/srpLossToJson';
import { triageLosses } from '../srp/triage/triageLosses';
import { triagedLossesToSuggestionJson } from '../srp/triage/triagedLossesToSuggestionJson';
import { fetchEveNames } from '../../data-source/esi/names';
import { Battle, MemberCorporation } from '../../db/tables';
import { sortBy, cmpNumberProp } from '../../util/sortBy';
import { isCapsule } from '../../eve/util/isCapsule';


/**
 * Given a list of results from dao.battle.listBattles(), converts them into
 * JSON for consumption by the front-end.
 */
export async function battlesToJson(
    db: Tnex,
    battles: AsyncReturnType<typeof dao.battle.listBattles>,
    includeSrps: boolean,
): Promise<BattleOutput> {
  const memberCorps = arrayToMap(
      await dao.config.getMemberCorporations(db),
      'memberCorporation_corporationId',
  );

  const ids = new Set<number | nil>();
  const battlesJson = battles.map(row => rowToJson(row, memberCorps, ids));
  const battlesJsonMap = arrayToMap(battlesJson, 'id');

  if (includeSrps) {
    const srpRows =
        await dao.srp.listSrps(db, { battles: pluck(battles, 'battle_id') });
    const srpJson = srpRows.map(row => srpLossToJson(row, ids));
    const triage = await triageLosses(db, srpRows);
    const suggestionJson = await triagedLossesToSuggestionJson(triage);
    for (let srp of srpJson) {
      srp.triage = suggestionJson.get(srp.killmail) || null;
    }

    for (let srpRow of srpRows) {
      if (srpRow.kmb_battle != null) {
        const srpJson = srpLossToJson(srpRow, ids);
        srpJson.triage = suggestionJson.get(srpRow.km_id) || null;
        const battleJson = battlesJsonMap.get(srpRow.kmb_battle);
        if (battleJson != undefined) {
          battleJson.srps.push(srpJson);
        }
      }
    }
  }

  const names = await fetchEveNames(ids);

  return {
    battles: battlesJson,
    names: names,
  };
}

function rowToJson(
    row: Battle,
    memberCorps: Map<number, MemberCorporation>,
    ids: Set<number | nil>,
): BattleJson {
  const teamMap = {} as SimpleNumMap<Team>;

  for (let participant of row.battle_data.participants) {
    const teamId = participant.corporationId || 0;
    let team = teamMap[teamId];
    if (team == undefined) {
      team = {
        corporationId: teamId,
        allianceId: participant.allianceId || null,
        members: [],
        totalLosses: 0,
      }
      teamMap[teamId] = team;
    }

    team.members.push(participant);
    if (participant.loss) {
      team.totalLosses += participant.loss.value;
    }
    teamMap[teamId] = team;

    ids.add(participant.characterId);
    ids.add(participant.corporationId);
    ids.add(participant.allianceId);
    ids.add(participant.shipId);
  }
  addAll(ids, row.battle_data.locations);

  const teams = Object.values(teamMap);
  sortBy(
      teams,
      (a, b) => {
        return rankTeam(a, memberCorps) - rankTeam(b, memberCorps);
      },
      cmpNumberProp('corporationId', 'reverse'));

  for (let team of teams) {
    sortBy(team.members, cmpNumberProp(member => {
      if (isCapsule(member.shipId)) {
        return Number.MAX_SAFE_INTEGER;
      } else {
        return member.shipId || null;
      }
    }));
  }

  return {
    id: row.battle_id,
    start: row.battle_start,
    end: row.battle_end,
    startLabel: moment.utc(row.battle_start).format('MMMM D, YYYY HH:mm'),
    locations: row.battle_data.locations,
    teams: teams,
    srps: [],
  };
}

function rankTeam(team: Team, memberCorps: Map<number, MemberCorporation>) {
  if (team.corporationId == null) {
    return 0;
  }
  const row = memberCorps.get(team.corporationId);
  if (row == undefined) {
    return 0;
  }
  if (row.memberCorporation_membership == 'full') {
    return 2;
  } else {
    return 1;
  }
}

export interface BattleOutput {
  battles: BattleJson[],
  names: SimpleNumMap<string>,
}

export interface BattleJson {
  id: number,
  start: number,
  startLabel: string,
  end: number,
  locations: number[],
  teams: Team[],
  srps: SrpLossJson[],
}

export interface Team {
  corporationId: number | null,
  allianceId: number | null,
  members: Participant[],
  totalLosses: number,
}
