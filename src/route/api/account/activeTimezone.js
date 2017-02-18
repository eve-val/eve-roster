const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const policy = require('../../../route-helper/policy');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  let targetAccountId = req.params.id;
  let isOwner = targetAccountId == account.id;
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
