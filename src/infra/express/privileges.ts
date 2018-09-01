import Bluebird = require('bluebird');

import { dao } from '../../db/dao';
import { Tnex } from '../../db/tnex';
import { PrivilegeName } from '../../db/dao/enums';
import { ADMIN_GROUP, MEMBER_GROUP } from '../../domain/account/specialGroups'

import { MissingPrivilegeError } from '../../error/MissingPrivilegeError';
import { buildLoggerFromFilename } from '../../infra/logging/buildLogger';

const logger = buildLoggerFromFilename(__filename);

const debugStr = process.env.DEBUG_GROUPS;
const debugGroups =
    checkDebugGroups(debugStr && JSON.parse(debugStr));

export function getPrivileges(db: Tnex, accountId: number) {
  let groups: string[];

  return Bluebird.resolve()
  .then(() => {
    return debugGroups || dao.group.getAccountGroups(db, accountId);
  })
  .then(_groups => {
    groups = _groups;
    return dao.group.getPrivilegesForGroups(db, groups);
  })
  .then(rows => {
    const privs = rows.map(row => {
      return {
        name: row.priv_name as PrivilegeName,
        level: row.granted_level || 0,
        ownerLevel: row.priv_ownerLevel,
        requiresMembership: row.priv_requiresMembership,
      }
    });

    return new AccountPrivileges(accountId, groups, privs);
  });
}

interface Priv {
  name: PrivilegeName,
  level: number,
  ownerLevel: number,
  requiresMembership: boolean,
};

export class AccountPrivileges {
  private _accountId: number;
  private _groups: string[];
  private _privs: Map<PrivilegeName, Priv>;
  private _precomputedLevels: Map<string, number>;

  constructor(accountId: number, groups: string[], privs: Priv[]) {
    this._accountId = accountId;
    this._groups = groups;
    this._precomputedLevels = new Map();

    this._privs = new Map();
    for (let priv of privs) {
      this._privs.set(priv.name, priv);
    }
  }

  isMember() {
    return this.belongsToGroup(MEMBER_GROUP);
  }

  belongsToGroup(group: string) {
    return this._groups.includes(group);
  }

  canRead(privilege: PrivilegeName, isOwner=false) {
    return this._satisfies(privilege, 1, isOwner);
  }

  canWrite(privilege: PrivilegeName, isOwner=false) {
    return this._satisfies(privilege, 2, isOwner);
  }

  requireRead(privilege: PrivilegeName, isOwner=false) {
    this._require(privilege, 1, isOwner);
    return this;
  }

  requireWrite(privilege: PrivilegeName, isOwner=false) {
    this._require(privilege, 2, isOwner);
    return this;
  }

  dumpForFrontend(privNames: PrivilegeName[], isOwner: boolean) {
    let out = <{[key: string]: number}>{};
    for (let privName of privNames) {
      out[privName] = this._getEffectiveLevel(privName, isOwner);
    }
    return out;
  }

  _require(privilege: PrivilegeName, level: number, isOwner=false) {
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

  _satisfies(privilegeName: PrivilegeName, requestedLevel: number, isOwner=false) {
    return this._getEffectiveLevel(privilegeName, isOwner) >= requestedLevel;
  }

  _getEffectiveLevel(privilegeName: PrivilegeName, isOwner: boolean) {
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

function checkDebugGroups(debugGroups: string[] | undefined) {
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
  return debugGroups;
}
