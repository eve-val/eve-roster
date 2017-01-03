const UnauthorizedClientError = require('./UnauthorizedClientError');

class MissingPrivilegeError extends UnauthorizedClientError {
  constructor(accountId, permission, level, isOwner, perms) {
    super(`Missing permission (${permission}, ${level}) for account ${accountId} (isOwner=${isOwner}).`);
    this.accountId = accountId;
    this.permission = permission;
    this.level = level;
    this.isOwner = isOwner;
    this.perms = perms;
  }
}
module.exports = MissingPrivilegeError;
