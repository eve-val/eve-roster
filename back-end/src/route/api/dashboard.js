const querystring = require('querystring');
const Promise = require('bluebird');

const moment = require('moment');

const dao = require('../../dao.js');
const getStub = require('../../route-helper/getStub');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');
const policy = require('../../route-helper/policy');


const CONFIG = require('../../config-loader').load();

const LOGIN_PARAMS = querystring.stringify({
  'response_type': 'code',
  'redirect_uri': 'http://localhost:8081/authenticate',
  'client_id':  CONFIG.ssoClientId,
  'scope': CONFIG.ssoScope.join(' '),
  'state': '12345',
});

module.exports = jsonEndpoint(function(req, res) {
  return (CONFIG.useStubOutput
    ? getStubOutput()
    : getRealOutput(req.session.accountId));
});

function getStubOutput() {
  let json = getStub('dashboard.json');
  json.loginParams = LOGIN_PARAMS;
  return Promise.resolve(json);
}

function getRealOutput(accountId) {
  let mainCharacter = null;
  let accountCreated = null;

  return dao.builder('account')
      .select('mainCharacter', 'created')
      .where({ id: accountId })
  .then(([row]) => {
    mainCharacter = row.mainCharacter;
    accountCreated = row.created;

    return dao.builder('ownership')
      .select('character.id', 'character.name', 'accessToken.needsUpdate')
      .join('character', 'character.id', '=', 'ownership.character')
      .join('accessToken', 'accessToken.character', '=', 'ownership.character')
      .where('ownership.account', accountId);
  })
  .then(rows => {
    let characters = [];

    for (let row of rows) {
      characters.push({
        id: row.id,
        name: row.name,
        needsReauth: row.needsUpdate,
      });
    }

    let access = {
      "designateMain": policy.canDesignateMain(accountCreated) ? 2 : 0,
    };

    return {
      accountId: accountId,
      characters: characters,
      loginParams: LOGIN_PARAMS,
      mainCharacter: mainCharacter,
      access: access,
    };
  });
}
