const dao = require('../../../dao');
const jsonEndpoint = require('../../../route-helper/jsonEndpoint');
const policy = require('../../../route-helper/policy');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  let targetAccountId = req.params.id;
  let isOwner = targetAccountId == accountId;
  privs.requireWrite('memberTimezone', isOwner);

  let timezone = req.body.activeTimezone;

  if (timezone != null && policy.TIMEZONE_LABELS.indexOf(timezone) < 0) {
    throw new BadRequestError('Invalid timezone: ' + timezone);
  }

  return dao.setAccountActiveTimezone(targetAccountId, timezone)
  .then(() => {
    return {};
  });
});
