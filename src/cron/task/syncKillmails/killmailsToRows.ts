import moment = require('moment');

import { ZKillmail } from '../../../data-source/zkillboard/ZKillmail';
import { Killmail } from '../../../dao/tables';
import { TYPE_CAPSULE, TYPE_CAPSULE_GENOLUTION } from '../../../eve/constants/types';
import { HullCategory, KillmailType } from '../../../dao/enums';
import { Moment } from 'moment';


/**
 * Converts a list of killmails into rows that can be inserted into the DB.
 * Clusters associated capsule and ship losses by setting the km_relatedLoss
 * field.
 */
export function killmailsToRows(
    mails: ZKillmail[],
    sourceCorporation: number,
    capsuleShipAssociationWindow: number,
) {
  const prevLossDict = new Map<number, PreviousLoss>();

  const rows: Killmail[] = [];
  let prevTimestamp: Moment | null = null;
  for (let mail of mails) {
    let timestamp = moment.utc(mail.killmail_time);
    if (prevTimestamp != null && prevTimestamp.isAfter(timestamp)) {
      throw new Error(`Killmails are not in order.`);
    }
    prevTimestamp = timestamp;

    const prevLoss = prevLossDict.get(mail.victim.character_id) || null;

    let associatedId: number | null = null;
    if (prevLoss != undefined) {
      const timeDiff =
          moment.utc(mail.killmail_time)
              .diff(moment.utc(prevLoss.mail.killmail_time));
      if (timeDiff <= capsuleShipAssociationWindow
          && getHullCategory(prevLoss.mail) == HullCategory.SHIP
          && getHullCategory(mail) == HullCategory.CAPSULE) {
        associatedId = prevLoss.mail.killmail_id;
        prevLoss.row.km_relatedLoss = mail.killmail_id;
      }
    }

    const row = {
      km_id: mail.killmail_id,
      km_character: mail.victim.character_id,
      km_timestamp: moment(mail.killmail_time).valueOf(),
      km_type: KillmailType.LOSS,
      km_hullCategory: getHullCategory(mail),
      km_relatedLoss: associatedId,
      km_sourceCorporation: sourceCorporation,
      km_data: mail,
    };
    rows.push(row);

    prevLossDict.set(mail.victim.character_id, { mail, row });
  }

  return rows;
}

// TODO: Would be great if this was less fragile in the face of CCP adding new
// capsule types.
function getHullCategory(killmail: ZKillmail) {
  if (killmail.victim.ship_type_id == TYPE_CAPSULE
      || killmail.victim.ship_type_id == TYPE_CAPSULE_GENOLUTION) {
    return HullCategory.CAPSULE;
  } else {
    return HullCategory.SHIP;
  }
}

interface PreviousLoss {
  mail: ZKillmail,
  row: Killmail,
}
