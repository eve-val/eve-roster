const Promise = require('bluebird');

const asyncUtil = require('../../../util/asyncUtil');
const dao = require('../../../dao');
const MissingAccessToken = require('../../../error/MissingTokenError');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const skillQueueSummarizer = require('../../../route-helper/skillQueueSummarizer');


module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  return dao.getCharactersOwnedByAccount(account.id, [
      'character.id',
    ])
  .then(rows => {
    return asyncUtil.parallelize(rows, row => {
      return skillQueueSummarizer.fetchSkillQueueSummary(dao, row.id, 'fresh')
      .then(summary => {
        return {
          id: row.id,
          skillQueue: summary,
        };
      });
    });
  });
});
