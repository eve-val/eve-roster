const UnauthorizedClientError = require('./UnauthorizedClientError');

class MissingPermissionError extends UnauthorizedClientError {
  constructor(accountId, permission, level, isOwner) {
    super(`Missing permission (${permission}, ${level}) for account ${accountId} (isOwner=${isOwner}).`);
    this.accountId = accountId;
    this.permission = permission;
    this.level = level;
    this.isOwner = isOwner;
  }
}
module.exports = MissingPermissionError;
