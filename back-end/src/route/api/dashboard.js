const querystring = require('querystring');
const Promise = require('bluebird');

const moment = require('moment');

const dao = require('../../dao.js');
const getStub = require('../../route-helper/getStub');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');
const policy = require('../../route-helper/policy');


const CONFIG = require('../../config-loader').load();

const LOGIN_PARAMS = querystring.stringify({
  'response_type': 'code',
  'redirect_uri': 'http://localhost:8081/authenticate',
  'client_id':  CONFIG.ssoClientId,
  'scope': CONFIG.ssoScope.join(' '),
  'state': '12345',
});

module.exports = protectedEndpoint('json', function(req, res, account, privs) {
  return (CONFIG.useStubOutput
    ? getStubOutput()
    : getRealOutput(account, privs));
});

function getStubOutput() {
  let json = getStub('dashboard.json');
  json.loginParams = LOGIN_PARAMS;
  return Promise.resolve(json);
}

function getRealOutput(account, privs) {
  let mainCharacter = null;
  let accountCreated = null;

  return dao.builder('account')
      .select('mainCharacter', 'created')
      .where({ id: account.id })
  .then(([row]) => {
    mainCharacter = row.mainCharacter;
    accountCreated = row.created;

    return dao.builder('ownership')
      .select(
          'character.id',
          'character.name',
          'character.corporationId',
          'ownership.opsec',
          'accessToken.needsUpdate')
      .join('character', 'character.id', '=', 'ownership.character')
      .join('accessToken', 'accessToken.character', '=', 'ownership.character')
      .where('ownership.account', account.id);
  })
  .then(rows => {
    let characters = [];

    for (let row of rows) {
      characters.push({
        id: row.id,
        name: row.name,
        needsReauth: !!row.needsUpdate,
        opsec: !!row.opsec,
        corpStatus: policy.corpStatus(row.corporationId),
      });
    }

    let access = {
      "designateMain": policy.canDesignateMain(accountCreated) ? 2 : 0,
      isMember: privs.isMember(),
    };

    return {
      accountId: account.id,
      characters: characters,
      loginParams: LOGIN_PARAMS,
      mainCharacter: mainCharacter,
      access: access,
    };
  });
}
