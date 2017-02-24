const querystring = require('querystring');
const Promise = require('bluebird');

const moment = require('moment');

const dao = require('../../dao.js');
const getStub = require('../../route-helper/getStub');
const protectedEndpoint = require('../../route-helper/protectedEndpoint');
const policy = require('../../route-helper/policy');

// TODO delete this and have LOGIN_PARAMS in one place
const isDeveloping = process.env.NODE_ENV !== 'production';
const listenPort = isDeveloping ? 8081 : process.env.PORT;
const externalPort = isDeveloping ? 8081 : process.env.DOKKU_NGINX_PORT;
const externalHostname = isDeveloping ? 'localhost' : process.env.HOSTNAME;

const CONFIG = require('../../config-loader').load();

const LOGIN_PARAMS = querystring.stringify({
  'response_type': 'code',
  'redirect_uri': `http://${externalHostname}:${externalPort}/authenticate`,
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

  return dao.getAccountDetails(account.id)
  .then(([row]) => {
    mainCharacter = row.mainCharacter;
    accountCreated = row.created;

    return dao.getCharactersOwnedByAccount(account.id, [
      'character.id',
      'character.name',
      'character.corporationId',
      'ownership.opsec',
      'accessToken.needsUpdate',
      'memberCorporation.membership'
    ])
  })
  .then(rows => {
    let characters = [];

    for (let row of rows) {
      characters.push({
        id: row.id,
        name: row.name,
        needsReauth: !!row.needsUpdate,
        opsec: !!row.opsec && privs.isMember(),
        corpStatus: getCorpStatus(row.membership),
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

function getCorpStatus(membership) {
  // TODO: Push this schema all the way down to the client and remove the need
  // for this transform
  switch (membership) {
    case 'full':
      return 'primary';
    case 'affiliated':
      return 'alt';
    default:
      return 'external';
  }
}
