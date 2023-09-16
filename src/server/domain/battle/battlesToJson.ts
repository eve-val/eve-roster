import moment from "moment";

import { Tnex } from "../../db/tnex/index.js";
import { dao } from "../../db/dao.js";
import {
  SimpleNumMap,
  nil,
  AsyncReturnType,
} from "../../../shared/util/simpleTypes.js";
import { arrayToMap, addAll } from "../../../shared/util/collections.js";
import { pluck } from "underscore";
import { srpLossToJson } from "../srp/srpLossToJson.js";
import { triageLosses } from "../srp/triage/triageLosses.js";
import { triagedLossesToSuggestionJson } from "../srp/triage/triagedLossesToSuggestionJson.js";
import { fetchEveNames } from "../../data-source/esi/names.js";
import { Battle, MemberCorporation } from "../../db/tables.js";
import { sortBy, cmpNumberProp } from "../../../shared/util/sortBy.js";
import { isCapsule } from "../../eve/util/isCapsule.js";
import {
  BattleJson,
  Srp_Battle_GET,
  Team,
} from "../../../shared/route/api/srp/battle/battle_GET.js";
import { Participant } from "../../../shared/types/srp/battle/BattleData.js";

/**
 * Given a list of results from dao.battle.listBattles(), converts them into
 * JSON for consumption by the front-end.
 */
export async function battlesToJson(
  db: Tnex,
  battles: AsyncReturnType<typeof dao.battle.listBattles>,
  includeSrps: boolean,
): Promise<Srp_Battle_GET> {
  const memberCorps = arrayToMap(
    await dao.config.getMemberCorporations(db),
    "mcorp_corporationId",
  );

  const ids = new Set<number | nil>();
  const battlesJson = battles.map((row) => rowToJson(row, memberCorps, ids));
  const battlesJsonMap = arrayToMap(battlesJson, "id");

  if (includeSrps) {
    const srpRows = await dao.srp.listSrps(db, {
      battles: pluck(battles, "battle_id"),
    });
    const srpJson = srpRows.map((row) => srpLossToJson(row, ids));
    const triage = await triageLosses(db, srpRows);
    const suggestionJson = await triagedLossesToSuggestionJson(triage);
    for (const srp of srpJson) {
      srp.triage = suggestionJson.get(srp.killmail) ?? null;
    }

    for (const srpRow of srpRows) {
      if (srpRow.kmb_battle != null) {
        const srpJson = srpLossToJson(srpRow, ids);
        srpJson.triage = suggestionJson.get(srpRow.km_id) ?? null;
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

  for (const participant of row.battle_data.participants) {
    const [teamId, teamType] = getTeamId(participant, memberCorps);
    let team = teamMap[teamId];
    if (team == undefined) {
      team = {
        teamId: teamId,
        corporationId: participant.corporationId ?? null,
        allianceId: participant.allianceId ?? null,
        members: [],
        totalLosses: 0,
        type: teamType,
      };
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
    cmpNumberProp("teamId", "reverse"),
  );

  for (const team of teams) {
    sortBy(
      team.members,
      cmpNumberProp((member) => {
        if (isCapsule(member.shipId)) {
          return Number.MAX_SAFE_INTEGER;
        } else {
          return member.shipId ?? null;
        }
      }),
    );
  }

  return {
    id: row.battle_id,
    start: row.battle_start,
    end: row.battle_end,
    startLabel: moment.utc(row.battle_start).format("MMMM D, YYYY HH:mm"),
    locations: row.battle_data.locations,
    teams: teams,
    srps: [],
  };
}

function getTeamId(
  participant: Participant,
  memberCorps: Map<number, MemberCorporation>,
): [number, Team["type"]] {
  if (participant.corporationId && memberCorps.has(participant.corporationId)) {
    return [participant.corporationId, "corporation"];
  } else if (participant.allianceId) {
    return [participant.allianceId, "alliance"];
  } else if (participant.corporationId) {
    return [participant.corporationId, "corporation"];
  } else {
    return [0, "unaffiliated"];
  }
}

function rankTeam(team: Team, memberCorps: Map<number, MemberCorporation>) {
  const row = memberCorps.get(team.teamId);
  if (row?.mcorp_membership == "full") {
    return 3;
  } else if (row != undefined) {
    // Non-full member corp
    return 2;
  } else {
    // Non-member corp or alliance (or unaffiliated)
    return 0;
  }
}
