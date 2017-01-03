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

  canRead(privilege, isOwner=false) {
    return this._satisfies(privilege, 1, isOwner);
  }

  canWrite(privilege, isOwner=false) {
    return this._satisfies(privilege, 2, isOwner);
  }

  requireRead(privilege, isOwner=false) {
    this._require(privilege, 1, isOwner);
    return this;
  }

  requireWrite(privilege, isOwner=false) {
    this._require(privilege, 2, isOwner);
    return this;
  }

  dumpForFrontend(privNames, isOwner) {
    let out = {};
    for (let privName of privNames) {
      out[privName] = this._getEffectiveLevel(privName, isOwner);
    }
    return out;
  }

  _require(privilege, level, isOwner=false) {
    if (!this._satisfies(privilege, level, isOwner)) {
      throw new MissingPrivilegeError(
          this._accountId, privilege, level, isOwner, this._privs);
    }
    return this;
  }

  _satisfies(privilegeName, requestedLevel, isOwner=false) {
    return this._getEffectiveLevel(privilegeName, isOwner) >= requestedLevel;
  }

  _getEffectiveLevel(privilegeName, isOwner) {
    let priv = this._privs.get(privilegeName);
    if (priv == null) {
      throw new Error('Unknown privilege: ' + privilegeName);
    }
    let effectiveLevel = priv.level || 0;
    if (isOwner) {
      effectiveLevel = Math.max(priv.level, priv.ownerLevel);
    }
    return effectiveLevel;
  }
}