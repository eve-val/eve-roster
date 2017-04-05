const Promise = require('bluebird');

const censor = require('./_censor');
const dao = require('../../../dao');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');


module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  privs.requireRead('serverConfig', false);

  return Promise.all([
    dao.config.getSiggyCredentials(),
    getCorpConfig(),
  ])
  .then(([siggyConfig, corpConfig]) => {
    corpConfig.sort(configSorter);

    if (corpConfig.length == 0) {
      corpConfig.push(EXAMPLE_CORP_CONFIG);
    }

    return {
      siggy: {
        username: siggyConfig.username,
        password: censor.censor(siggyConfig.password, 0, 10),
      },
      corporations: corpConfig,
    };
  });
});

function getCorpConfig() {
  return Promise.resolve()
  .then(() => dao.config.getMemberCorporations())
  .then(configRows => {
    return Promise.map(
        configRows,
        configRow => convertCorpConfigRowToJson(configRow)); 
  });
}

function convertCorpConfigRowToJson(configRow) {
  return Promise.resolve()
  .then(() => {
    return dao.config.getCorpTitleToGroupMapping(
        configRow.corporationId);
  })
  .then(mappingRows => {
    return {
      id: configRow.corporationId,
      membership: configRow.membership,
      keyId: censor.censor(configRow.apiKeyId, 2, 5),
      vCode: censor.censor(configRow.apiVerificationCode, 4, 25),
      titles: createTitleMap(mappingRows),
    };
  });
}

function createTitleMap(mapRows) {
  let map = {};
  for (let row of mapRows) {
    map[row.title] = row.group;
  }
  return map;
}

function configSorter(a, b) {
  if (a.membership == 'full' && b.membership != 'full') {
    return -1;
  } else if (b.membership == 'full' && a.membership != 'full') {
    return 1;
  } else {
    return 0;
  }
}

const EXAMPLE_CORP_CONFIG = {
  id: 123456,
  membership: 'full/affiliated',
  keyId: '123456',
  vCode: 'tson12CJas97AhaoAHh912lOntqo81GlkdNQN...',
  titles: {
    'Staff': 'admin',
    'Line Member': 'full_member',
    'Greenie': 'provisional_member',
  },
};
