const Promise = require('bluebird');

const dao = require('../dao');
const logger = require('../util/logger')(__filename);
const specialGroups = require('../route-helper/specialGroups');
const MissingPrivilegeError = require('../error/MissingPrivilegeError');

const ADMIN_GROUP = specialGroups.ADMIN_GROUP;
const MEMBER_GROUP = specialGroups.MEMBER_GROUP;

const debugGroups =
    process.env.DEBUG_GROUPS && JSON.parse(process.env.DEBUG_GROUPS);
checkDebugGroups(debugGroups);

module.exports = {
  get(accountId) {
    let groups;

    return Promise.resolve()
    .then(() => {
      return debugGroups || dao.getAccountGroups(accountId);
    })
    .then(_groups => {
      groups = _groups;
      return dao.getPrivilegesForGroups(groups);
    })
    .then(privs => {
      return new AccountPrivileges(accountId, groups, privs);
    });
  }
};

class AccountPrivileges {
  constructor(accountId, groups, privs) {
    this._accountId = accountId;
    this._groups = groups;

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
    return this.belongsToGroup(MEMBER_GROUP);
  }

  belongsToGroup(group) {
    return this._groups.includes(group);
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
          this._accountId,
          privilege,
          level,
          isOwner,
          this._groups,
          this._privs);
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
    if (this.belongsToGroup(ADMIN_GROUP)) {
      effectiveLevel = 2;
    }
    this._precomputedLevels.set(key, effectiveLevel);
    return effectiveLevel;
  }
}

function checkDebugGroups() {
  if (debugGroups) {
    logger.info(
        `Using hard-coded ACL groups for all requests: [${debugGroups}].`)
    if (debugGroups.length > 0 && !debugGroups.includes(MEMBER_GROUP)) {
      logger.warn('###########################################');
      logger.warn(`WARNING: debugGroups is nonempty, but is missing the`
          + `"${MEMBER_GROUP}" group. This is probably a mistake.`);
      logger.warn('###########################################');
    }
  }
}
