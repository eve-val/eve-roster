const querystring = require('querystring');

const dao = require('../../dao.js');
const getStub = require('../../route-helper/getStub');
const jsonEndpoint = require('../../route-helper/jsonEndpoint');


const CONFIG = require('../../config-loader').load();

const LOGIN_PARAMS = querystring.stringify({
  'response_type': 'code',
  'redirect_uri': 'http://localhost:8081/authenticate',
  'client_id':  CONFIG.ssoClientId,
  'scope': CONFIG.ssoScope.join(' '),
  'state': '12345',
});

const STUB_OUTPUT = false;

module.exports = jsonEndpoint(function(req, res) {
  return (STUB_OUTPUT
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

  return dao.builder('account')
      .select('mainCharacter')
      .where({ id: accountId })
  .then(rows => {
    mainCharacter = rows[0].mainCharacter;

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
      })
    }

    return {
      characters: characters,
      loginParams: LOGIN_PARAMS,
      mainCharacter: mainCharacter,
    };
  });
}
