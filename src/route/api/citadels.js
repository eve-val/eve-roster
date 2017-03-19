const Promise = require('bluebird');

const dao = require('../../dao');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireRead('roster');

  return Promise.resolve(dao.getCitadels())
      .then(function(citadelList) {
        return {
          citadels: citadelList,
        }
      });
});
