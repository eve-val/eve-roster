const moment = require('moment');
const Promise = require('bluebird');

const dao = require('../../dao');
const error = require('../../util/error');
const eve = require('../../eve');
const logger = require('../../util/logger')(__filename);
const protectedEndpoint = require('../../route-helper/protectedEndpoint');

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
  .then(function([ownedChars, unownedChars, corpNames]) {
    let accountList = [];

    pushOwnedChars(ownedChars, accountList, privs, corpNames);

    for (let unownedChar of unownedChars) {
      accountList.push(
          getAccountOutput(
              unownedChar, null, false /* not owned */, privs, corpNames));
    }

    return {
      columns: getProvidedColumns(privs),
      rows: accountList
    };
  });

});

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
    // TODO: Should we add a warning flag here if !(main.corporation in corps)?
    outList.push(
        getAccountOutput(
            group.main, group.alts, true /* is owned */, privs, corpNames));
  }
}

function getAccountOutput(mainRow, altRows, isOwned, privs, corpNames) {
  let obj = {
    main: getCharOutput(mainRow, privs, corpNames),
    alts: null,
    isOwned: isOwned,
  };

  if (altRows != null && privs.canRead('memberAlts')) {
    // TODO: Filter out external alts if missing memberExternalAlts perm
    obj.alts = altRows.map(char => getCharOutput(char, privs, corpNames));
  } else {
    obj.alts = [];
  }

  if (privs.canRead('memberHousing')) {
    obj.activeTimezone = mainRow.activeTimezone || null;
  }

  if (privs.canRead('memberTimezone')) {
    obj.homeCitadel = mainRow.homeCitadel || null;
  }

  return obj;
}

function getCharOutput(row, privs, corpNames) {
  let obj = {
    id: row.id,
    name: row.name,
    corporationId: row.corporationId,
    corporationName: corpNames ?
        corpNames.get(row.corporationId) : 'Name unavailable'
  };

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
  let providedColumns =
      ['id', 'name', 'corporationId', 'corporationName', 'isOwned'];

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
