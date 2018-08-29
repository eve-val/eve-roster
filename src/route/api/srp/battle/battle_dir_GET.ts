import moment = require('moment');

import { jsonEndpoint } from '../../../../express/protectedEndpoint';
import { Tnex, ResultOrder } from '../../../../tnex';
import { SimpleNumMap, nil } from '../../../../util/simpleTypes';
import { BattleFilter, BattleColumn, BoundCmp } from '../../../../dao/BattleDao';
import { dao } from '../../../../dao';
import { SrpLossJson } from '../../../../domain/srp/SrpLossJson';
import { Battle, MemberCorporation } from '../../../../dao/tables';
import { Participant } from '../../../../domain/battle/BattleData';
import { addAll, arrayToMap } from '../../../../util/collections';
import { fetchEveNames } from '../../../../eve/esi/names';
import { sortBy, cmpNumberProp } from '../../../../util/sortBy';
import { isCapsule } from '../../../../eve/util/isCapsule';
import { pluck } from '../../../../util/underscore';
import { triageLosses } from '../../../../domain/srp/triage/triageLosses';
import { triagedLossesToSuggestionJson } from '../../../../domain/srp/triage/triagedLossesToSuggestionJson';
import { srpLossToJson } from '../../../../domain/srp/srpLossToJson';
import { optional, array, stringEnum, number, boolean, object, verify } from '../../../../route-helper/schemaVerifier';
import { jsonQuery, boolQuery } from '../../../../route-helper/paramVerifier';

export interface Output {
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

const FILTER_SCHEMA = {
  orderBy: optional(array({
    key: stringEnum<BattleColumn>(BattleColumn),
    order: stringEnum<ResultOrder>(ResultOrder),
  })),
  limit: optional(number()),
  offset: optional(number()),
  untriaged: optional(boolean()),
  bound: optional(object({
    col: stringEnum<BattleColumn>(BattleColumn),
    cmp: stringEnum<BoundCmp>(BoundCmp),
    value: number(),
  })),
};

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {

  const includeSrps = boolQuery(req, 'includeSrp') || false;;
  const filter = verify(jsonQuery(req, 'filter') || {}, FILTER_SCHEMA);

  if (filter.limit == undefined) {
    filter.limit = 30;
  }
  filter.limit = Math.min(100, Math.max(1, filter.limit));

  if (filter.offset != undefined) {
    filter.offset = Math.max(0, filter.offset);
  }

  return queryBattles(db, filter, includeSrps);
});

async function queryBattles(
    db: Tnex,
    filter: BattleFilter,
    includeSrps: boolean,
): Promise<Output> {
  const memberCorps = arrayToMap(
      await dao.config.getMemberCorporations(db),
      'memberCorporation_corporationId',
  );
  const battles = await dao.battle.listBattles(db, filter);

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
