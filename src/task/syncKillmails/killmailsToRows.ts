import moment = require('moment');

import { ZKillmail } from '../../data-source/zkillboard/ZKillmail';
import { Killmail } from '../../db/tables';
import { TYPE_CAPSULE, TYPE_CAPSULE_GENOLUTION } from '../../eve/constants/types';
import { HullCategory, KillmailType } from '../../db/dao/enums';
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
    const victimCharacter = mail.victim.character_id;

    let timestamp = moment.utc(mail.killmail_time);
    if (prevTimestamp != null && prevTimestamp.isAfter(timestamp)) {
      throw new Error(`Killmails are not in order.`);
    }
    prevTimestamp = timestamp;

    let prevLoss: PreviousLoss | null = null;
    if (victimCharacter != undefined) {
      prevLoss = prevLossDict.get(victimCharacter) || null;
    }

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

    const kmType = mail.victim.corporation_id == sourceCorporation
        ? KillmailType.LOSS
        : KillmailType.KILL;

    const row = {
      km_id: mail.killmail_id,
      km_character: victimCharacter || null,
      km_timestamp: timestamp.valueOf(),
      km_type: kmType,
      km_hullCategory: getHullCategory(mail),
      km_relatedLoss: associatedId,
      km_sourceCorporation: sourceCorporation,
      km_data: mail,
    };
    rows.push(row);

    if (victimCharacter != undefined) {
      prevLossDict.set(victimCharacter, { mail, row });
    }
  }

  return rows;
}

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
