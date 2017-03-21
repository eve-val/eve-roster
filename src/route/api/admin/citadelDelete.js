const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let citadelId = req.params.id;

  return dao.getCitadel(citadelId)
  .then(([row]) => {
    if(!row) {
      throw new BadRequestError(`Citadel not found: ${citadelId}.`);
    }

    privs.requireWrite('citadels');

    return dao.dropCitadel(citadelId);
  });
});
