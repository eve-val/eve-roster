import querystring = require('querystring');
import Promise = require('bluebird');
import axios from 'axios';

import { dao } from '../dao';
import { Tnex } from '../tnex';
import { MissingTokenError } from '../error/MissingTokenError';

const logger = require('../util/logger')(__filename);


const SSO_AUTH_CODE =
      Buffer.from(process.env.SSO_CLIENT_ID + ':' + process.env.SSO_SECRET_KEY)
          .toString('base64');
const TOKEN_EXPIRATION_FUDGE_MS = 10000;   // 10 seconds
const REQUEST_TIMEOUT = 10000;

const pendingTokenRequests = {} as {[key: number]: Promise<any>};

export function getAccessTokenForCharacter(db: Tnex, characterId: number)
    : Promise<string> {
  logger.debug('getAccessToken', characterId);
  if (pendingTokenRequests[characterId]) {
    logger.trace('  request for this character already pending, waiting...');
    return pendingTokenRequests[characterId];
  }
  logger.trace('  no pending requests, starting a new one...');

  let work = dao.accessToken.getForCharacter(db, characterId)
    .then(row => {
      if (!row) {
        throw new MissingTokenError(characterId);
      }

      if (Date.now() 
          <= row.accessToken_accessTokenExpires - TOKEN_EXPIRATION_FUDGE_MS) {
        logger.debug(
            '  Reusing existing access token:',
            printSafeToken(row.accessToken_accessToken));
        return row.accessToken_accessToken;
      } else {
        logger.debug('  Existing token has expired, fetching a new one...');
        return refreshAccessToken(
            db, characterId, row.accessToken_refreshToken);
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

function printSafeToken(token: string) {
  if (token.length < 5) {
    return '...';
  } else {
    return token.substr(0, 5) + '...' + token.substr(token.length - 5, 5);
  }
}

function refreshAccessToken(
    db: Tnex,
    characterId: number,
    refreshToken: string,
    ): Promise<string> {
  let tokenResponse: RefreshedToken;
  return Promise.resolve()
  .then(() => {
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
  })
  .then(function(response) {
    tokenResponse = response.data;
    logger.debug(
        '  Got a new access token:',
        printSafeToken(tokenResponse.access_token));
  })
  .then(function() {
    logger.debug('  Updating database...');
    return dao.accessToken.updateForCharacter(db, characterId, {
      accessToken_accessToken: tokenResponse.access_token,
      accessToken_accessTokenExpires:
          Date.now() + 1000 * tokenResponse.expires_in,
    })
  })
  .then(function() {
    logger.debug('  Token fetch complete.');

    return tokenResponse.access_token;
  });
}

interface RefreshedToken {
  access_token: string,
  expires_in: number,
}
