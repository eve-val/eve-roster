const _ = require('underscore');

const dao = require('../../dao');
const getStub = require('../../route-helper/getStub');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');

const STUB_OUTPUT = false;
const CONFIG = require('../../config-loader').load();

module.exports = jsonEndpoint(function(req, res) {
  if (STUB_OUTPUT) {
    return Promise.resolve(getStub('roster.json'));
  }

  return Promise.all([
    dao.getCharactersOwnedByMembers(),
    dao.getUnownedCorpCharacters(),
  ])
  .then(function([ownedChars, unownedChars]) {
    let accountList = [];

    pushOwnedChars(ownedChars, accountList);

    for (let unownedChar of unownedChars) {
      accountList.push(
          getAccountOutput(unownedChar, null, false /* not owned */));
    }

    return accountList;
  });

});

function pushOwnedChars(ownedRows, outList) {
  let accountGroups = new Map();
  let unownedChars = [];

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
        getAccountOutput(group.main, group.alts, true /* is owned */));
  }
}

function getAccountOutput(mainRow, altRows, isOwned) {
  return {
    isOwned: isOwned,
    activeTimezone: mainRow.activeTimezone || null,
    homeCitadel: mainRow.homeCitadel || null,
    main: getCharOutput(mainRow),
    alts: altRows == null ? [] : altRows.map(getCharOutput),
  };
}

function getCharOutput(row) {
  return {
    id: row.id,
    name: row.name,
    corporationId: row.corporationId,

    logonDate: row.logonDate,
    logoffDate: row.logoffDate,
    killsInLastMonth: row.killsInLastMonth,
    killValueInLastMonth: row.killValueInLastMonth,
    lossesInLastMonth: row.lossesInLastMonth,
    lossValueInLastMonth: row.lossValueInLastMonth,
    siggyScore: row.siggyScore,
  };
}
