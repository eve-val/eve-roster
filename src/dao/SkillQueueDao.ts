import Bluebird = require('bluebird');

import { Tnex, val } from '../tnex';
import { Dao } from '../dao';
import { characterSkillQueue, sdeType } from './tables';
import { defaultSkillName } from '../domain/skills/defaultSkillName';


class SkillQueueDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getCachedSkillQueue(
      db: Tnex, characterId: number): Bluebird<NamedSkillQueueRow[]> {
    return db
        .select(characterSkillQueue)
        .leftJoin(sdeType, 'styp_id', '=', 'characterSkillQueue_skill')
        .where('characterSkillQueue_character', '=', val(characterId))
        .orderBy('characterSkillQueue_queuePosition', 'asc')
        .columns(
            'characterSkillQueue_skill',
            'characterSkillQueue_targetLevel',
            'characterSkillQueue_startTime',
            'characterSkillQueue_endTime',
            'characterSkillQueue_levelStartSp',
            'characterSkillQueue_levelEndSp',
            'characterSkillQueue_trainingStartSp',
            'styp_name',
            )
        .run()
    .then(rows => {
      return rows.map(row => {
        return {
          skill: row.characterSkillQueue_skill,
          name:
              row.styp_name || defaultSkillName(row.characterSkillQueue_skill),
          targetLevel: row.characterSkillQueue_targetLevel,
          startTime: row.characterSkillQueue_startTime,
          endTime: row.characterSkillQueue_endTime,
          levelStartSp: row.characterSkillQueue_levelStartSp,
          levelEndSp: row.characterSkillQueue_levelEndSp,
          trainingStartSp: row.characterSkillQueue_trainingStartSp,
        }
      });
    })
  }

  setCachedSkillQueue(
      db: Tnex,
      characterId: number,
      queueItems: SkillQueueRow[],
      ) {

    let items = queueItems.map((qi, index) => {
      return {
        characterSkillQueue_character: characterId,
        characterSkillQueue_queuePosition: index,

        characterSkillQueue_skill: qi.skill,
        characterSkillQueue_targetLevel: qi.targetLevel,
        characterSkillQueue_startTime: qi.startTime,
        characterSkillQueue_endTime: qi.endTime,
        characterSkillQueue_levelStartSp: qi.levelStartSp,
        characterSkillQueue_levelEndSp: qi.levelEndSp,
        characterSkillQueue_trainingStartSp: qi.trainingStartSp,
      };
    });

    return db
        .replace(
            characterSkillQueue,
            'characterSkillQueue_character',
            characterId,
            items);
  }
}
export default SkillQueueDao;

export interface SkillQueueRow {
  skill: number,
  targetLevel: number,
  levelStartSp: number,
  levelEndSp: number,
  trainingStartSp: number,
  // startTime and endTime wil be null if the queue is paused.
  startTime: number | null,
  endTime: number | null,
}

export interface NamedSkillQueueRow extends SkillQueueRow {
  name: string,
}
