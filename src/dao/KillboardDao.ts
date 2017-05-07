import Promise = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { character, killboard } from '../dao/tables';

export default class KillboardDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  getAllCharacterKillboardTimestamps(db: Tnex) {
    return db
        .select(character)
        .leftJoin(killboard, 'killboard_character', '=', 'character_id')
        .columns(
            'character_id',
            'character_name',
            'killboard_updated',
            )
        .run();
  }

  updateCharacterKillboard(
      db: Tnex,
      characterId: number,
      kills: number,
      losses: number,
      killValue: number,
      lossValue: number,
      ) {
    return db
      .upsert(killboard, {
        killboard_character: characterId,
        killboard_killsInLastMonth: kills,
        killboard_killValueInLastMonth: killValue,
        killboard_lossesInLastMonth: losses,
        killboard_lossValueInLastMonth: lossValue,
        killboard_updated: Date.now(),
      }, 'killboard_character');
  }
}
