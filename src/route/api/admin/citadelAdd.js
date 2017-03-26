const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  return Promise.resolve()
  .then(() => {
    privs.requireWrite('citadels');

    validate(req.body);
    return dao.citadel.add(
      req.body.name,
      req.body.type,
      req.body.allianceAccess,
      req.body.allianceOwned
    );
  })
  .then(id => {
    return dao.citadel.getById(id);
  })
  .then(([row]) => {
    return row;
  });
});

let validate = function(body) {
  if(!body.name) {
    die('no name provided.');
  }
  if(!body.type) {
    die('no type provided.');
  }
  if(body.allianceAccess !== 0 && body.allianceAccess !== 1) {
    die(`bad allianceAccess value '${body.allianceAccess}'`);
  }
  if(body.allianceOwned !== 0 && body.allianceOwned !== 1) {
    die(`bad allianceOwned value '${body.allianceOwned}'`);
  }
};

let die = function(error) {
  throw new BadRequestError(`Cannot add citadel: ${error}`);
}
