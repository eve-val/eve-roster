import moment from "moment";
import { AnnotatedKillmail } from "../../../domain/killmail/AnnotatedKillmail.js";
import { Killmail } from "../../../db/tables.js";
import { HullCategory } from "../../../db/dao/enums.js";
import { isCapsule } from "../../../eve/util/isCapsule.js";

/**
 * Converts a ZKillmail to a row in the killmail table.
 *
 * Always marks km_relatedLoss as null; this needs to be filled in later.
 */
export function killmailToRow(killmail: AnnotatedKillmail): Killmail {
  return {
    km_id: killmail.killmail_id,
    km_character: killmail.victim.character_id ?? null,
    km_victimCorp: killmail.victim.corporation_id ?? null,
    km_timestamp: moment.utc(killmail.killmail_time).valueOf(),
    km_hullCategory: getHullCategory(killmail),
    km_relatedLoss: null,
    km_data: killmail,
    km_processed: false,
  };
}

function getHullCategory(killmail: AnnotatedKillmail) {
  if (isCapsule(killmail.victim.ship_type_id)) {
    return HullCategory.CAPSULE;
  } else {
    return HullCategory.SHIP;
  }
}
