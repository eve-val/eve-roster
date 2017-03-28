const Promise = require('bluebird');

const dao = require('../../dao');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireRead('citadels');

  return Promise.resolve(dao.citadel.getAll())
      .then(function(citadelList) {
        return {
          citadels: citadelList,
        }
      });
});
