const UnauthorizedClientError = require('./UnauthorizedClientError');

class MissingPrivilegeError extends UnauthorizedClientError {
  constructor(accountId, permission, level, isOwner, groups, perms) {
    super(`Missing permission (${permission}, ${level}) for account `
        + `${accountId} (isOwner=${isOwner}). Groups=[${groups}]`);
    this.accountId = accountId;
    this.permission = permission;
    this.level = level;
    this.isOwner = isOwner;
    this.groups = groups;
    this.perms = perms;
  }
}
module.exports = MissingPrivilegeError;
