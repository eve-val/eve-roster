const Promise = require('bluebird');

const dao = require('../../../dao');
const MissingTokenError = require('../../../error/MissingTokenError');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const skillQueue = require('../../../data-source/skillQueue');
const time = require('../../../util/time');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let characterId = req.params.id;

  return dao.getOwner(characterId)
  .then(row => {
    let owningAccount = row != null ? row.id : null;
    privs.requireRead('characterSkillQueue', account.id == owningAccount);
  })
  .then(() => {
    return skillQueue.getQueue(characterId);
  })
  .then(function(esiQueue) {
    if (esiQueue.length == 0) {
      return [];
    }
    let outQueue = [];

    let now = new Date();
    let queueEnd = new Date(esiQueue[esiQueue.length - 1].finish_date);
    let totalDuration = queueEnd - now;

    for (let i = 0; i < esiQueue.length; i++) {
      let queueItem = esiQueue[i];
      let skillId = queueItem.skill_id;

      let skillStart = i == 0 ? now : new Date(queueItem.start_date);
      let skillEnd = new Date(queueItem.finish_date);

      let newItem = {
        id: skillId,
        proportionalStart: (skillStart - now) / totalDuration,
        proportionalEnd: (skillEnd - now) / totalDuration,
        durationLabel: time.shortDurationString(skillStart, skillEnd),
        targetLevel: queueItem.finished_level,
      };

      if (i == 0) {
        newItem.progress = skillQueue.getProgress(queueItem);
      }

      outQueue.push(newItem);
    }

    // TODO: Make this standalone by adding the name and trained level to all
    // the entries?
    return { queue: outQueue };
  })
  .catch(function(err) {
    if (err instanceof MissingTokenError) {
      return { warning: 'Missing access token, unable to fetch skill queue.' };
    } else {
      throw err;
    }
  })
});
