import Promise = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { character, combatStats } from '../dao/tables';

export default class CombatStatsDao {
  constructor(
      private _dao: Dao,
      ) {
  }

  getAllCharacterCombatStatsTimestamps(db: Tnex) {
    return db
        .select(character)
        .leftJoin(combatStats, 'cstats_character', '=', 'character_id')
        .columns(
            'character_id',
            'character_name',
            'cstats_updated',
            )
        .run();
  }

  updateCharacterCombatStats(
      db: Tnex,
      characterId: number,
      kills: number,
      losses: number,
      killValue: number,
      lossValue: number,
      ) {
    return db
      .upsert(combatStats, {
        cstats_character: characterId,
        cstats_killsInLastMonth: kills,
        cstats_killValueInLastMonth: killValue,
        cstats_lossesInLastMonth: losses,
        cstats_lossValueInLastMonth: lossValue,
        cstats_updated: Date.now(),
      }, 'cstats_character');
  }
}
