const dao = require('../../../dao');
const jsonEndpoint = require('../../../route-helper/jsonEndpoint');

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  let targetAccountId = req.params.id;
  let isOwner = targetAccountId == accountId;

  return Promise.resolve()
  .then(() => {
    privs.requireWrite('memberHousing', isOwner);
    return dao.setAccountCitadel(targetAccountId, req.body.citadelId);
  })
  .then(() => {
    return {};
  });
});
