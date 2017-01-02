const dao = require('../dao');
const MissingPrivilegeError = require('../error/MissingPrivilegeError');

const CONFIG = require('../config-loader').load();


module.exports = {
  get(accountId) {
    return (CONFIG.debugRoles == undefined
        ? dao.getPrivilegesForAccount(accountId)
        : dao.getPrivilegesForRoles(CONFIG.debugRoles)
    )
    .then(privs => {
      return new AccountPrivileges(accountId, privs);
    });
  }
};

class AccountPrivileges {
  constructor(accountId, privs) {
    this._accountId = accountId;

    this._privs = new Map();
    for (let priv of privs) {
      this._privs.set(
        priv.name,
        {
          level: priv.level,
          ownerLevel: priv.ownerLevel,
        }
      );
    }
  }

  canRead(permission, isOwner=false) {
    return this._satisfies(permission, 1, isOwner);
  }

  canWrite(permission, isOwner=false) {
    return this._satisfies(permission, 2, isOwner);
  }

  requireRead(permission, isOwner=false) {
    this._require(permission, 1, isOwner);
    return this;
  }

  requireWrite(permission, isOwner=false) {
    this._require(permission, 2, isOwner);
    return this;
  }

  _require(permission, level, isOwner=false) {
    if (!this._satisfies(permission, level, isOwner)) {
      throw new MissingPrivilegeError(
          this._accountId, permission, level, isOwner, this._privs);
    }
    return this;
  }

  _satisfies(permissionName, requestedLevel, isOwner=false) {
    let priv = this._privs.get(permissionName);
    if (priv == null) {
      throw new Error('Unknown permission: ' + permissionName);
    }
    let effectiveLevel = priv.level || 0;
    if (isOwner) {
      effectiveLevel = Math.max(priv.level, priv.ownerLevel);
    }
    return effectiveLevel >= requestedLevel;
  }
}
