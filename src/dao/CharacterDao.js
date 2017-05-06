

const CharacterDao = module.exports = class {
  constructor(parent, builder) {
    this._parent = parent;
    this._builder = builder;
  }

  getCachedSkillQueue(characterId) {
    return this._builder('characterSkillQueue')
        .select(
            'skill',
            'targetLevel',
            'startTime',
            'endTime',
            'levelStartSp',
            'levelEndSp',
            'trainingStartSp')
        .where('character', '=', characterId)
        .orderBy('queuePosition', 'asc');
  }

  setCachedSkillQueue(characterId, queueItems) {
    return this._parent.transaction(trx => {
      return Promise.resolve()
      .then(() => {
        return trx.builder('characterSkillQueue')
            .del()
            .where('character', '=', characterId);
      })
      .then(() => {
        if (queueItems.length > 0) {
          let items = queueItems.map((queueItem, index) => {
            return Object.assign(
                {
                  character: characterId,
                  queuePosition: index,
                },
                queueItem);
          });
          console.log('Storing!', items);
          return trx.builder('characterSkillQueue')
            .insert(items);
        }
      });
    })
  }

}
