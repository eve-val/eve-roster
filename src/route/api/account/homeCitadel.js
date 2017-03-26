const Promise = require('bluebird');

const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let targetAccountId = req.params.id;
  let citadelName = req.body.citadelName;
  let isOwner = targetAccountId == account.id;

  privs.requireWrite('memberHousing', isOwner);

  return dao.citadel.getByName(citadelName)
  .then(([row]) => {
    if (!row) {
      throw new BadRequestError('Unknown citadel: ' + citadelName);
    }
    return dao.setAccountCitadel(targetAccountId, row.id);
  })
  .then(() => {
    return {};
  });
});
