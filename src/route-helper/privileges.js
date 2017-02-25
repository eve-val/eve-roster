const Promise = require('bluebird');

const dao = require('../dao');
const MissingPrivilegeError = require('../error/MissingPrivilegeError');

const debugRoles = process.env.DEBUG_ROLES || null;

module.exports = {
  get(accountId) {
    let roles;

    return Promise.resolve()
    .then(() => {
      return debugRoles || dao.getAccountRoles(accountId);
    })
    .then(_roles => {
      roles = _roles;
      return dao.getPrivilegesForAccount(debugRoles || accountId);
    })
    .then(privs => {
      return new AccountPrivileges(accountId, roles, privs);
    });
  }
};

class AccountPrivileges {
  constructor(accountId, roles, privs) {
    this._accountId = accountId;
    this._roles = roles;

    this._privs = new Map();
    for (let priv of privs) {
      this._privs.set(
        priv.name,
        {
          level: priv.level,
          ownerLevel: priv.ownerLevel,
          requiresMembership: !!priv.requiresMembership,
        }
      );
    }

    this._precomputedLevels = new Map();
  }

  isMember() {
    return this.hasRole('__member');
  }

  hasRole(role) {
    return this._roles.includes(role);
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
    let key = `${isOwner},${privilegeName}`;
    let effectiveLevel = this._precomputedLevels.get(key);
    if (effectiveLevel != undefined) {
      return effectiveLevel;
    }

    let priv = this._privs.get(privilegeName);
    if (priv == null) {
      throw new Error('Unknown privilege: ' + privilegeName);
    }
    effectiveLevel = priv.level || 0;
    if (isOwner) {
      effectiveLevel = Math.max(priv.level, priv.ownerLevel);
    }
    if (priv.requiresMembership && !this.isMember()) {
      effectiveLevel = 0;
    }
    if (this.hasRole('__admin')) {
      effectiveLevel = 2;
    }
    this._precomputedLevels.set(key, effectiveLevel);
    return effectiveLevel;
  }
}
