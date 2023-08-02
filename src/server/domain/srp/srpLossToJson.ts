import moment from "moment";
import _ from "underscore";

import { SrpLossRow } from "../../db/dao/SrpDao.js";
import { nil } from "../../../shared/util/simpleTypes.js";
import { ZKillmail } from "../../data-source/zkillboard/ZKillmail.js";
import {
  AttackerJson,
  SrpLossJson,
  UnifiedSrpLossStatus,
} from "../../../shared/types/srp/SrpLossJson.js";

/**
 * Shared logic for dumping the representation of an SRPable loss to JSON.
 * The "triage" field in the resulting JSON will always be null; it's up to
 * the caller to fill this in if necessary.
 *
 * @param ids Will add any IDs that need names into this set.
 */
export function srpLossToJson(
  row: SrpLossRow,
  ids: Set<number | nil>,
): SrpLossJson {
  const json: SrpLossJson = {
    killmail: row.km_id,
    timestamp: moment.utc(row.km_timestamp).format("YYYY-MM-DD HH:mm"),
    shipType: row.km_data.victim.ship_type_id,
    victim: row.km_data.victim.character_id,
    victimCorp: row.km_data.victim.corporation_id,
    relatedKillmail: row.related_data
      ? {
          id: row.related_data.killmail_id,
          shipId: row.related_data.victim.ship_type_id,
        }
      : null,
    executioner: getExecutioner(row.km_data, ids),
    status:
      row.srpr_paid == true
        ? ("paid" as UnifiedSrpLossStatus)
        : row.srpv_status,
    reason: row.srpv_reason,
    tag: row.srpv_tag,
    payout: row.srpv_payout,
    reimbursement: row.srpr_id,
    payingCharacter: row.srpr_payingCharacter,
    renderingCharacter: row.rendering_mainCharacter,
    triage: null,
    battle: row.kmb_battle,
  };

  ids.add(json.shipType);
  ids.add(json.victim);
  ids.add(json.victimCorp);
  ids.add(json.payingCharacter);
  ids.add(json.renderingCharacter);

  return json;
}

function getExecutioner(mail: ZKillmail, ids: Set<number | nil>): AttackerJson {
  const executioner = _.findWhere(mail.attackers, { final_blow: true })!;

  ids.add(executioner.ship_type_id);
  ids.add(executioner.character_id);
  ids.add(executioner.corporation_id);
  ids.add(executioner.alliance_id);

  return {
    ship: executioner.ship_type_id,
    character: executioner.character_id,
    corporation: executioner.corporation_id,
    alliance: executioner.alliance_id,
    faction: executioner.faction_id,
  };
}
