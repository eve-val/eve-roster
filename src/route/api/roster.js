const moment = require('moment');
const Promise = require('bluebird');

const dao = require('../../dao');
const error = require('../../util/error');
const eve = require('../../eve');
const logger = require('../../util/logger')(__filename);
const protectedEndpoint = require('../../route-helper/protectedEndpoint');

const CHAR_NO_MSG = 0;
const CHAR_INFO_MSG = 1;
const CHAR_WARNING_MSG = 2;
const CHAR_ERROR_MSG = 3;

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireRead('roster');

  let memberCorps;
  let corpNames;
  return dao.config.getMemberCorporations()
  .then(corpRows => {
    memberCorps = { mainCorpIds: [], altCorpIds: [] };
    for (let c of corpRows) {
      if (c.membership == 'full') {
        memberCorps.mainCorpIds.push(c.corporationId);
      } else if (c.membership == 'affiliated') {
        memberCorps.altCorpIds.push(c.corporationId);
      }
    }

    return dao.getRosterCharacterCorps();
  })
  .then(corpIds => {
    return eve.esi.corporations.names(corpIds);
  })
  .then(response => {
    corpNames = new Map();
    for (let cn of response) {
      corpNames.set(cn.id, cn.name);
    }
  })
  .catch(e => {
    if (error.isAnyEsiError(e)) {
      // Move on with a null map and show a warning later
      // FIXME attach warning to response object once warnings are supported
      // in the roster client view
      logger.error('ESI error fetching corporation names', e);
      corpNames = null;
      return null;
    } else {
      // Re-throw since it's something more serious
      throw e;
    }
  })
  .then(() => {
    return Promise.all([
      dao.getCharactersOwnedByMembers(),
      dao.getUnownedCorpCharacters(),
    ]);
  })
  .then(([ownedChars, unownedChars]) => {
    let accountList = [];

    pushOwnedChars(ownedChars, accountList, privs, memberCorps, corpNames);

    for (let unownedChar of unownedChars) {
      accountList.push(
          getAccountOutput(unownedChar, null, false /* not owned */, privs,
              memberCorps, corpNames));
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

function addMessage(data, message, level) {
  if (data.warning) {
    // Append message and possibly increase level
    data.warning = data.warning + '\n' + message;
    data.warningLevel = Math.max(data.warningLevel, level);
  } else {
    // No previous message so set as-is
    data.warning = message;
    data.warningLevel = level;
  }
}

function pushOwnedChars(ownedRows, outList, privs, memberCorps, corpNames) {
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
            group.main, group.alts, true /* is owned */, privs, memberCorps,
            corpNames));
  }
}

function getAccountOutput(mainRow, altRows, isOwned, privs, memberCorps,
    corpNames) {
  let obj = {
    main: getCharOutput(mainRow, privs, memberCorps, corpNames),
    alts: null,
  };

  if (!isOwned) {
    addMessage(obj, 'Character is not claimed.', CHAR_WARNING_MSG);
  }

  let mainInFullCorp = memberCorps.mainCorpIds.includes(mainRow.corporationId);
  let mainInAffilCorp = memberCorps.altCorpIds.includes(mainRow.corporationId);
  if (!mainInFullCorp && !mainInAffilCorp) {
    addMessage(mainRow, 'Main character is not in any affiliated corporation.',
        CHAR_ERROR_MSG);
  } else if (!mainInFullCorp) {
    addMessage(mainRow, 'Main character is not in primary corporation.',
        CHAR_WARNING_MSG);
  }

  if (altRows != null && privs.canRead('memberAlts')) {
    // pushOwnedChars already filters out opsec alts, so no additional filtering
    // is necessary.
    obj.alts = altRows.map(char =>
        getCharOutput(char, privs, memberCorps, corpNames));
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
        addMessage(obj, 'Trial member.', CHAR_INFO_MSG);
      }
      return obj;
    });
  }

  // No further asynchronous data is needed so just return obj
  return Promise.resolve(obj);
}

function parseTitles(titleString) {
  if (titleString) {
    return JSON.parse(titleString);
  } else {
    return [];
  }
}

function getCharOutput(row, privs, memberCorps, corpNames) {
  let obj = {
    id: row.id,
    name: row.name,
    corporationId: row.corporationId,
    corporationName: corpNames ?
        corpNames.get(row.corporationId) : 'Name unavailable'
  };

  let titles = parseTitles(row.titles);
  let inMemberCorp = memberCorps.mainCorpIds.includes(row.corporationId)
      || memberCorps.altCorpIds.includes(row.corporationId);
  if (inMemberCorp && titles.length == 0) {
    addMessage(obj, 'Character does not have roles.', CHAR_ERROR_MSG);
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
    'warning',
    'warningLevel'
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
