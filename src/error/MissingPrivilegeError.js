const UnauthorizedClientError = require('./UnauthorizedClientError');

class MissingPrivilegeError extends UnauthorizedClientError {
  constructor(accountId, permission, level, isOwner, roles, perms) {
    super(`Missing permission (${permission}, ${level}) for account `
        + `${accountId} (isOwner=${isOwner}). Roles=[${roles}]`);
    this.accountId = accountId;
    this.permission = permission;
    this.level = level;
    this.isOwner = isOwner;
    this.roles = roles;
    this.perms = perms;
  }
}
module.exports = MissingPrivilegeError;
