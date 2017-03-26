const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let citadelId = req.params.id;

  return Promise.resolve()
  .then(() => {
    privs.requireWrite('citadels');

    if(req.body.name) {
      return dao.citadel.setName(citadelId, req.body.name);
    } else {
      throw new BadRequestError(
          `Cannot set citadel ${citadelId} name: no name provided.`);
    }
  });
});
