const querystring = require('querystring');

const axios = require('axios');

const configLoader = require('./config-loader');
const dao = require('./dao');


const CONFIG = configLoader.load();
const SSO_AUTH_CODE =
      Buffer.from(CONFIG.ssoClientId + ':' + CONFIG.ssoSecretKey)
          .toString('base64');
const TOKEN_EXPIRATION_FUDGE_MS = 10000;   // 10 seconds
const REQUEST_TIMEOUT = 10000;

let pendingTokenRequests = {};

module.exports = {
  // Make one shared instance of the ESI module so that everything uses the same cache
  esi: require('eve_swagger_interface')({
    // defaults are okay
  }),

  getAccessToken: function (characterId) {
    console.log('getAccessToken', characterId);
    if (pendingTokenRequests[characterId]) {
      console.log('  request for this character already pending, waiting...');
      return pendingTokenRequests[characterId];
    }
    console.log('  no pending requests, starting a new one...');

    let work = dao.builder('accessToken')
      .select(
        'refreshToken',
        'accessToken',
        'accessTokenExpires',
        'needsUpdate')
      .where('character', '=', characterId)
      .then(function (rows) {
        const row = rows[0];
        if (!row) {
          throw new Error('No access tokens for this character.');
        }

        if (Date.now() <= row.accessTokenExpires - TOKEN_EXPIRATION_FUDGE_MS) {
          console.log('  Reusing existing access token:', printSafeToken(row.accessToken));
          return row.accessToken;
        } else {
          console.log('  Existing token has expired, fetching a new one...');
          return refreshAccessToken(characterId, row.refreshToken);
        }
      })
      .then(function (accessToken) {
        delete pendingTokenRequests[characterId];
        return accessToken;
      })
      .catch(function (err) {
        delete pendingTokenRequests[characterId];
        throw err;
      });

    pendingTokenRequests[characterId] = work;
    return work;
  }
};

function printSafeToken(token) {
  if (token.length < 5) {
    return '...';
  } else {
    return token.substr(0, 5) + '...' + token.substr(token.length - 5, 5);
  }
}

function refreshAccessToken(characterId, refreshToken) {
  let tokenResponse;
  return axios.post(
      'https://login.eveonline.com/oauth/token',
      querystring.stringify({
        grant_type: 'refresh_token',
        refresh_token: refreshToken,
      }), {
        headers: {
          'Authorization': 'Basic ' + SSO_AUTH_CODE,
        },
        timeout: REQUEST_TIMEOUT,
      })
  .then(function(response) {
    tokenResponse = response.data;
    console.log(
        '  Got a new access token:',
        printSafeToken(tokenResponse.access_token));
  })
  .then(function() {
    console.log('  Updating database...');
    return dao.builder('accessToken')
        .update({
          accessToken: tokenResponse.access_token,
          accessTokenExpires: Date.now() + 1000 * tokenResponse.expires_in,
        })
        .where('character', '=', characterId);
  })
  .then(function() {
    console.log('  Token fetch complete.');

    return tokenResponse.access_token;
  });
}
