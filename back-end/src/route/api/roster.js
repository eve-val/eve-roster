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
    let charList = [];

    pushOwnedChars(ownedChars, charList);

    for (let unownedChar of unownedChars) {
      charList.push(getCharOutput(unownedChar, false /* not owned */));
    }

    return charList;
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
    let charOut = getCharOutput(row, true /* is owned */);
    if (row.id == row.mainCharacter) {
      group.main = charOut;
    } else {
      group.alts.push(charOut);
    }
  }

  for (let group of accountGroups.values()) {
    // TODO: Should we add a warning flag here if !(main.corporation in corps)?
    group.main.alts = group.alts;
    outList.push(group.main);
  }
}

function getCharOutput(row, isOwned) {
  return {
    id: row.id,
    name: row.name,
    corporationId: row.corporationId,
    isOwned: isOwned,

    logonDate: row.logonDate,
    logoffDate: row.logoffDate,
    killsInLastMonth: row.killsInLastMonth,
    killValueInLastMonth: row.killValueInLastMonth,
    lossesInLastMonth: row.lossesInLastMonth,
    lossValueInLastMonth: row.lossValueInLastMonth,
    siggyScore: row.siggyScore,

    activeTimezone: row.activeTimezone,
    homeCitadel: row.homeCitadel,
  };
}
