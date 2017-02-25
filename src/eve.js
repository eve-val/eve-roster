const querystring = require('querystring');

const axios = require('axios');
const esi = require('eve_swagger_interface');

const MissingTokenError = require('./error/MissingTokenError');
const dao = require('./dao');
const logger = require('./util/logger')(__filename);


const SSO_AUTH_CODE =
      Buffer.from(process.env.SSO_CLIENT_ID + ':' + process.env.SSO_SECRET_KEY)
          .toString('base64');
const TOKEN_EXPIRATION_FUDGE_MS = 10000;   // 10 seconds
const REQUEST_TIMEOUT = 10000;

let pendingTokenRequests = {};

module.exports = {
  // Make one shared instance of the ESI module so that everything uses the same cache
  esi: esi({ agent: process.env.USER_AGENT || 'Sound Roster App' }),

  getAccessToken: function (characterId) {
    logger.debug('getAccessToken', characterId);
    if (pendingTokenRequests[characterId]) {
      logger.trace('  request for this character already pending, waiting...');
      return pendingTokenRequests[characterId];
    }
    logger.trace('  no pending requests, starting a new one...');

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
          throw new MissingTokenError(characterId);
        }

        if (Date.now() <= row.accessTokenExpires - TOKEN_EXPIRATION_FUDGE_MS) {
          logger.debug('  Reusing existing access token:', printSafeToken(row.accessToken));
          return row.accessToken;
        } else {
          logger.debug('  Existing token has expired, fetching a new one...');
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
    logger.debug(
        '  Got a new access token:',
        printSafeToken(tokenResponse.access_token));
  })
  .then(function() {
    logger.debug('  Updating database...');
    return dao.builder('accessToken')
        .update({
          accessToken: tokenResponse.access_token,
          accessTokenExpires: Date.now() + 1000 * tokenResponse.expires_in,
        })
        .where('character', '=', characterId);
  })
  .then(function() {
    logger.debug('  Token fetch complete.');

    return tokenResponse.access_token;
  });
}
