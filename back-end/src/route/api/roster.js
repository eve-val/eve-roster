const Promise = require('bluebird');

const dao = require('../../dao');
const getStub = require('../../route-helper/getStub');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');

const CONFIG = require('../../config-loader').load();

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  if (CONFIG.useStubOutput) {
    return Promise.resolve(getStub('roster.json'));
  }
  privs.requireRead('roster');

  return Promise.all([
    dao.getCharactersOwnedByMembers(),
    dao.getUnownedCorpCharacters(),
  ])
  .then(function([ownedChars, unownedChars]) {
    let accountList = [];

    pushOwnedChars(ownedChars, accountList, privs);

    for (let unownedChar of unownedChars) {
      accountList.push(
          getAccountOutput(unownedChar, null, false /* not owned */, privs));
    }

    return {
      columns: getProvidedColumns(privs),
      rows: accountList
    };
  });

});

function pushOwnedChars(ownedRows, outList, privs) {
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
      group.alts.push(row);
    }
  }

  for (let group of accountGroups.values()) {
    // TODO: Should we add a warning flag here if !(main.corporation in corps)?
    outList.push(
        getAccountOutput(group.main, group.alts, true /* is owned */, privs));
  }
}

function getAccountOutput(mainRow, altRows, isOwned, privs) {
  let obj = {
    main: getCharOutput(mainRow, privs),
    alts: null,
    isOwned: isOwned,
  };

  if (altRows != null && privs.canRead('memberAlts')) {
    // TODO: Filter out external alts if missing memberExternalAlts perm
    obj.alts = altRows.map(char => getCharOutput(char, privs))
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

function getCharOutput(row, privs) {
  let obj = {
    id: row.id,
    name: row.name,
    corporationId: row.corporationId,
  };

  if (privs.canRead('characterActivityStats')) {
    obj.logonDate = row.logonDate;
    obj.logoffDate = row.logoffDate;
    obj.killsInLastMonth = row.killsInLastMonth;
    obj.killValueInLastMonth = row.killValueInLastMonth;
    obj.lossesInLastMonth = row.lossesInLastMonth;
    obj.lossValueInLastMonth = row.lossValueInLastMonth;
    obj.siggyScore = row.siggyScore;
  }

  return obj;
}

function getProvidedColumns(privs) {
  let providedColumns = ['id', 'name', 'corporationId', 'isOwned'];
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
      'logonDate',
      'logoffDate',
      'killsInLastMonth',
      'killValueInLastMonth',
      'lossesInLastMonth',
      'lossValueInLastMonth',
      'siggyScore'
    );
  }
  return providedColumns;
}
