const moment = require('moment');

import { SrpLossRow } from "../../db/dao/SrpDao";
import { nil } from "../../util/simpleTypes";
import { ZKillmail } from "../../data-source/zkillboard/ZKillmail";
import { findWhere } from "../../util/underscore";
import { SrpLossJson, UnifiedSrpLossStatus, AttackerJson } from "./SrpLossJson";


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
    timestamp: moment.utc(row.km_timestamp).format('YYYY-MM-DD HH:mm'),
    shipType: row.km_data.victim.ship_type_id,
    victim: row.km_data.victim.character_id,
    victimCorp: row.km_data.victim.corporation_id,
    relatedKillmail: row.related_data ? {
      id: row.related_data.killmail_id,
      shipId: row.related_data.victim.ship_type_id,
    } : null,
    executioner: getExecutioner(row.km_data, ids),
    status: row.srpr_paid == true ?
        <UnifiedSrpLossStatus>'paid' : row.srpv_status,
    reason: row.srpv_reason,
    payout: row.srpv_payout,
    reimbursement: row.srpr_id,
    payingCharacter: row.srpr_payingCharacter,
    triage: null,
  }

  ids.add(json.shipType);
  ids.add(json.victim);
  ids.add(json.victimCorp);
  ids.add(row.srpr_payingCharacter);

  return json;
}

function getExecutioner(
    mail: ZKillmail,
    ids: Set<number | nil>,
): AttackerJson {
  const executioner = findWhere(mail.attackers, { final_blow: true })!;

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
