import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { SkillQueueEntry } from '../../../dao/SkillQueueDao';

import { parallelize } from '../../../util/asyncUtil';
import { fetchSkillQueueSummary, SkillQueueSummary } from '../../../route-helper/skillQueueSummarizer';


export type Payload = Array<{
  id: number,
  skillQueue: SkillQueueSummary,
}>

export default jsonEndpoint(function(req, res, db, account, privs)
    : Promise<Payload> {
  return dao.character.getCharacterIdsOwnedByAccount(db, account.id)
  .then(ids => {
    return parallelize(ids, id => {
      return fetchSkillQueueSummary(db, id, 'fresh')
      .then(summary => {
        return {
          id: id,
          skillQueue: summary,
        };
      });
    });
  });
})
