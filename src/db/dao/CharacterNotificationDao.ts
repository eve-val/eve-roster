const moment = require('moment');

import { Dao } from '../dao';
import { EsiNotification } from '../../data-source/esi/EsiNotification';
import {
  account,
  character,
  characterNotification,
  characterNotificationUpdate,
  ownership,
  sdeType,
} from '../tables';
import { Tnex, val } from '../tnex';

export default class CharacterNotificationDao {
  constructor(private _parent: Dao) {}

  async setCharacterNotifications(
    db: Tnex,
    characterId: number,
    notifications: EsiNotification[]
  ): Promise<void> {
    let items = notifications.map(n => {
      return {
        characterNotification_character: characterId,
        characterNotification_id: n.notification_id,
        characterNotification_senderId: n.sender_id,
        characterNotification_senderType: n.sender_type,
        characterNotification_text: n.text || "",
        characterNotification_timestamp: moment(n.timestamp).valueOf(),
        characterNotification_type: n.type,
      };
    });

    return db.transaction(async (db) => {
      await db.upsert(
        characterNotificationUpdate,
        {
          characterNotificationUpdate_character: characterId,
          characterNotificationUpdate_timestamp: Date.now(),
        },
        'characterNotificationUpdate_character'
      );
      await db.upsertAll(characterNotification, items, 'characterNotification_id');
    });
  }

  async getLastUpdateTimestamp(db: Tnex, characterId: number): Promise<number> {
    const timestamp = await db
      .select(characterNotificationUpdate)
      .where('characterNotificationUpdate_character', '=', val(characterId))
      .columns('characterNotificationUpdate_timestamp')
      .fetchFirst();
    return timestamp?.characterNotificationUpdate_timestamp || 0;
  }
}
