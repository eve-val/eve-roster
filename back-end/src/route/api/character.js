const _ = require('underscore');
const Promise = require('bluebird');

const dao = require('../../dao');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');
const getStub = require('../../route-helper/getStub');
const policy = require('../../route-helper/policy');
const NotFoundError = require('../../error/NotFoundError');

const CONFIG = require('../../config-loader').load();

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  if (CONFIG.useStubOutput) {
    return Promise.resolve(getStub('character.json'));
  }

  let characterId = req.params.id;
  let isOwned = false;
  let payload;

  // Fetch character and account data
  return dao.builder('character')
      .select(
          'character.name',
          'character.corporationId', 
          'account.activeTimezone',
          'citadel.id as citadelId',
          'citadel.name as citadelName',
          'account.id as accountId',
          'account.mainCharacter')
      .leftJoin('ownership', 'character.id', '=', 'ownership.character')
      .leftJoin('account', 'account.id', '=', 'ownership.account')
      .leftJoin('citadel', 'citadel.id', '=', 'account.homeCitadel')
      .where('character.id', '=', characterId)
  .then(([row]) => {
    if (row == null) {
      throw new NotFoundError();
    }
    isOwned = accountId == row.accountId;

    payload = {
      character: {
        name: row.name,
        corporationId: row.corporationId,
      },
      account: {
        id: row.accountId,
      },
      access: privs.dumpForFrontend(
        [
          'memberTimezone',
          'memberHousing',
          'characterSkills',
          'characterSkillQueue',
        ],
        isOwned),
    };

    if (privs.canRead('memberTimezone', isOwned)) {
      payload.account.activeTimezone = row.activeTimezone;
    }

    if (privs.canRead('memberHousing', isOwned)) {
      payload.account.citadelName = row.citadelName;
    }

    if (privs.canRead('memberAlts', isOwned) && row.accountId != null) {
      if (row.mainCharacter == characterId) {
        return injectAlts(row.accountId, characterId, payload);
      } else {
        return injectMain(row.mainCharacter, payload);
      }
    }
  })
  .then(() => {
    if (privs.canWrite('memberTimezone', isOwned)) {
      payload.timezones = policy.TIMEZONE_LABELS;
    }
    if (privs.canWrite('memberHousing', isOwned)) {
      return dao.getCitadels()
      .then(rows => {
        payload.citadels = _.pluck(rows, 'name');
      });
    }
  })
  .then(() => {
    return payload;
  });
});

function injectAlts(accountId, thisCharacterId, payload) {
  return dao.builder('ownership')
      .select('character.id', 'character.name')
      .join('character', 'id', '=', 'ownership.character')
      .where('ownership.account', '=', accountId)
      .andWhere('ownership.character', '!=', thisCharacterId)
  .then(function(rows) {
    // TODO: Restrict this on memberExternalAlts priv
    let alts = [];
    for (let row of rows) {
      alts.push({
        id: row.id,
        name: row.name,
      });
    }
    alts.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });

    if (alts.length > 0) {
      payload.account.alts = alts;
    }
  });
}

function injectMain(mainCharacterId, payload) {
  return dao.builder('character')
      .select('name')
      .where('id', '=', mainCharacterId)
  .then(function([row]) {
    payload.account.main = {
      id: mainCharacterId,
      name: row.name,
    };
  });
}