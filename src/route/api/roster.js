const moment = require('moment');
const Promise = require('bluebird');

const dao = require('../../dao');
const error = require('../../util/error');
const eve = require('../../eve');
const logger = require('../../util/logger')(__filename);
const protectedEndpoint = require('../../route-helper/protectedEndpoint');

// Must match src/client/roster/CharacterRow.vue MSG_x
const MSG_INFO = 1;
const MSG_WARNING = 2;
const MSG_ERROR = 3;

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireRead('roster');

  return dao.getRosterCharacterCorps()
  .then(corpIds => {
    return eve.esi.corporations.names(corpIds);
  })
  .then(corpNames => {
    let corpNameMap = new Map();
    for (let cn of corpNames) {
      corpNameMap.set(cn.id, cn.name);
    }
    return corpNameMap;
  })
  .catch(e => {
    if (error.isAnyEsiError(e)) {
      // Move on with a null map and show a warning later
      // FIXME attach warning to response object once warnings are supported
      // in the roster client view
      logger.error('ESI error fetching corporation names', e);
      return null;
    } else {
      // Re-throw since it's something more serious
      throw e;
    }
  })
  .then(corpNames => {
    return Promise.all([
      dao.getCharactersOwnedByMembers(),
      dao.getUnownedCorpCharacters(),
      Promise.resolve(corpNames) // Pass through
    ]);
  })
  .then(([ownedChars, unownedChars, corpNames]) => {
    let accountList = [];

    pushOwnedChars(ownedChars, accountList, privs, corpNames);

    for (let unownedChar of unownedChars) {
      accountList.push(
          getAccountOutput(
              unownedChar, null, false /* not owned */, privs, corpNames));
    }

    return Promise.all(accountList);
  })
  .then((accountList) => {
    return {
      columns: getProvidedColumns(privs),
      rows: accountList
    };
  });

});

function addAlert(data, message, level) {
  if (data.alertMessage) {
    // Append message and possibly increase level
    data.alertMessage = data.alertMessage + '\n' + message;
    data.alertLevel = Math.max(data.alertLevel, level);
  } else {
    // No previous message so set as-is
    data.alertMessage = message;
    data.alertLevel = level;
  }
}

function pushOwnedChars(ownedRows, outList, privs, corpNames) {
  let accountGroups = new Map();

  for (let row of ownedRows) {
    let accountId = row.accountId;
    let group = accountGroups.get(accountId);
    if (group == null) {
      group = {
        main: null,
        alts: [],
      };
      accountGroups.set(accountId, group);
    }
    if (row.id == row.mainCharacter) {
      group.main = row;
    } else {
      if (!row.opsec || privs.canRead('memberOpsecAlts')) {
        delete row.opsec;
        group.alts.push(row);
      }
    }
  }

  for (let group of accountGroups.values()) {
    outList.push(
        getAccountOutput(
            group.main, group.alts, true /* is owned */, privs, corpNames));
  }
}

function getAccountOutput(mainRow, altRows, isOwned, privs, corpNames) {
  let obj = {
    main: getCharOutput(mainRow, true /* isMain */, privs, corpNames),
    alts: null,
  };

  if (!isOwned) {
    addAlert(obj, 'Character is not claimed.', MSG_WARNING);
  }

  let mainInFullCorp = mainRow.corpMembership == 'full';
  let mainInAffilCorp = mainRow.corpMembership == 'affiliated';
  if (!mainInFullCorp && !mainInAffilCorp) {
    addAlert(obj, 'Main character is not in any affiliated corporation.',
        MSG_ERROR);
  } else if (!mainInFullCorp) {
    addAlert(obj, 'Main character is not in primary corporation.',
        MSG_WARNING);
  }

  if (altRows != null && privs.canRead('memberAlts')) {
    // pushOwnedChars already filters out opsec alts, so no additional filtering
    // is necessary.
    obj.alts = altRows.map(char => getCharOutput(
        char, false /* isMain */, privs, corpNames));
  } else {
    obj.alts = [];
  }

  if (privs.canRead('memberHousing')) {
    obj.activeTimezone = mainRow.activeTimezone || null;
  }

  if (privs.canRead('memberTimezone')) {
    obj.homeCitadel = mainRow.homeCitadel || null;
  }

  // Do not bother checking for memberGroups privilege, since warnings are
  // accessible to all members, and the trial member status is almost always
  // determined by a title (which is public info in Eve). But checking via
  // access groups is more robust here since the roster sync code has already
  // resolved all custom titles to groups (no need to duplicate).
  // - This does mean that unclaimed accounts cannot be marked as trial members.
  if (mainRow.accountId) {
    return dao.getAccountGroups(mainRow.accountId)
    .then(groups => {
      if (groups.includes('provisional_member')) {
        addAlert(obj, 'Trial member.', MSG_INFO);
      }
      return obj;
    });
  }

  // No further asynchronous data is needed so just return obj
  return Promise.resolve(obj);
}

function getCharOutput(row, isMain, privs, corpNames) {
  let obj = {
    id: row.id,
    name: row.name,
    corporationId: row.corporationId,
    corporationName: corpNames ?
        corpNames.get(row.corporationId) : 'Name unavailable'
  };

  
  if (row.corpMembership == 'full' || row.corpMembership == 'affiliated') {
    // This is only concerned with # of titles, so a null value, empty string
    //  or an empty JSON array are bad. Any other text value is presumably
    //  a JSON array with at least one title element.
    if (row.titles == null || row.titles.length == 0 || row.titles == '[]') {
      if (isMain) {
        addAlert(obj, 'Main does not have roles.', MSG_ERROR);
      } else {
        addAlert(obj, 'Alt does not have roles.', MSG_WARNING);
      }
    }
  }

  if (privs.canRead('characterActivityStats')) {
    let lastSeen;
    let lastSeenLabel;
    if (row.logonDate != null && row.logoffDate != null) {
      lastSeen = row.logonDate > row.logoffDate ? Date.now() : row.logoffDate;
      lastSeenLabel = row.logonDate > row.logoffDate ?
          'now' : moment(row.logoffDate).fromNow();
    } else {
      lastSeen = 0;
      lastSeenLabel = null;
    }

    obj.lastSeen = lastSeen;
    obj.lastSeenLabel = lastSeenLabel;
    obj.killsInLastMonth = row.killsInLastMonth;
    obj.killValueInLastMonth = row.killValueInLastMonth;
    obj.lossesInLastMonth = row.lossesInLastMonth;
    obj.lossValueInLastMonth = row.lossValueInLastMonth;
    obj.siggyScore = row.siggyScore;
  }

  return obj;
}

function getProvidedColumns(privs) {
  let providedColumns = [
    'id',
    'name',
    'corporationId',
    'corporationName',
    'alertMessage',
    'alertLevel'
  ];

  if (privs.canRead('memberAlts')) {
    providedColumns.push('alts');
  }
  if (privs.canRead('memberHousing')) {
    providedColumns.push('activeTimezone');
  }
  if (privs.canRead('memberTimezone')) {
    providedColumns.push('homeCitadel');
  }

  if (privs.canRead('characterActivityStats')) {
    providedColumns.push(
      'lastSeen',
      'killsInLastMonth',
      'killValueInLastMonth',
      'lossesInLastMonth',
      'lossValueInLastMonth',
      'siggyScore'
    );
  }
  return providedColumns;
}
