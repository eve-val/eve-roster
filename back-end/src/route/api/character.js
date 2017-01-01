const dao = require('../../dao');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');
const getStub = require('../../route-helper/getStub');

const STUB_OUTPUT = false;

module.exports = jsonEndpoint(function(req, res, accountId, privs) {
  if (STUB_OUTPUT) {
    return Promise.resolve(getStub('character.json'));
  }

  let characterId = req.params.id;
  let payload;

  // Fetch character and account data
  return dao.builder('character')
      .select(
          'character.name',
          'character.corporationId', 
          'account.activeTimezone',
          'account.homeCitadel',
          'account.id as accountId',
          'account.mainCharacter')
      .leftJoin('ownership', 'character.id', '=', 'ownership.character')
      .leftJoin('account', 'account.id', '=', 'ownership.account')
      .where('character.id', '=', characterId)
  .then(function([row]) {
    let owned = accountId == row.accountId;

    payload = {
      name: row.name,
      corporationId: row.corporationId,
      access: [],
    };

    if (privs.canRead('memberTimezone', owned)) {
      payload.activeTimezone = row.activeTimezone;
    }

    if (privs.canRead('memberHousing', owned)) {
      payload.homeCitadel = row.homeCitadel;
    }

    if (privs.canRead('characterSkills', owned)) {
      payload.access.push('skills');
    }

    if (privs.canRead('characterSkillQueue', owned)) {
      payload.access.push('skillQueue');
    }

    if (privs.canRead('memberAlts', owned) && row.accountId != null) {
      if (row.mainCharacter == characterId) {
        return injectAlts(row.accountId, characterId, payload);
      } else {
        return injectMain(row.mainCharacter, payload);
      }
    }
  })
  .then(function() {
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
      payload.alts = alts;
    }
  });
}

function injectMain(mainCharacterId, payload) {
  return dao.builder('character')
      .select('name')
      .where('id', '=', mainCharacterId)
  .then(function([row]) {
    payload.main = {
      id: mainCharacterId,
      name: row.name,
    };
  });
}