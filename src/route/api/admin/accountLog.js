const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireRead('accountLogs', false);

  return dao.getAccountLogsRecent()
  .then(rows => {
    return {
      rows: rows,
    };
  });
});
