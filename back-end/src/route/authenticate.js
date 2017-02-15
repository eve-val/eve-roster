const axios = require('axios');
const express = require('express');
const querystring = require('querystring');

const configLoader = require('../config-loader');
const dao = require('../dao');
const error = require('../util/error');
const eve = require('../eve');
const accountRoles = require('../data-source/accountRoles');
const UserVisibleError = require('../error/UserVisibleError');


const CONFIG = configLoader.load();
const logger = require('../util/logger')(__filename);

const SSO_AUTH_CODE =
      Buffer.from(CONFIG.ssoClientId + ':' + CONFIG.ssoSecretKey)
          .toString('base64');

module.exports = function(req, res) {
  logger.info('~~~ Auth request ~~~');
  logger.info('query:', req.query);

  let charTokens;
  let charData;

  return getAccessToken(req.query.code)
  .then(characterTokens => {
    charTokens = characterTokens;
    return getCharInfo(charTokens);
  })
  .then(characterData => {
    charData = characterData;

    return handleCharLogin(req.session.accountId, charData, charTokens);
  })
  .then(accountId => {
    logger.info('accountId =', accountId);
    logger.info('~~ Auth complete ~~');
    req.session.accountId = accountId;
    res.redirect('/');
  })
  .catch(e => {
    // TODO
    logger.error('Auth failure:', e);
    res.status(500);
    res.send('<pre>' + e.stack + '</pre>');
  });
};

function getAccessToken(queryCode) {
  logger.debug('Getting access tokens from auth code...');
  return axios.post(
      'https://login.eveonline.com/oauth/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code: queryCode,
      }), {
        headers: {
          'Authorization': 'Basic ' + SSO_AUTH_CODE,
        },
      })
  .then(response => {
    logger.debug('tokens:', response.data);
    return response.data;
  });
}

function getCharInfo(charTokens) {
  let charData = {
    id: null,
    name: null,
    scopes: null,
    corporationId: null,
  };

  logger.debug('Getting auth info...');
  return axios.get('https://login.eveonline.com/oauth/verify', {
    headers: {
      'Authorization': 'Bearer ' + charTokens.access_token,
    },
  })
  .then(response => {
    logger.debug('Auth info:', response.data);

    charData.id = response.data.CharacterID;
    charData.name = response.data.CharacterName;
    charData.scopes = response.data.Scopes;

    logger.debug('Getting ESI character info...');
    return eve.esi.characters(charData.id).info()
    .then(esiCharData => {
      logger.debug('ESI character info:', esiCharData);
      charData.corporationId = esiCharData.corporation_id;
    })
    .catch(e => {
      if (error.isAnyEsiError(e)) {
        logger.warn('ESI is unavailable, moving on with our lives...');
        logger.warn(e);
      } else {
        throw e;
      }
    })
    .then(() => {
      logger.debug('Final char data:', charData);
      return charData;
    });
  })
}

function handleCharLogin(accountId, charData, charTokens) {
  return dao.builder('character')
        .select(
            'character.name', 'ownership.account', 'accessToken.needsUpdate')
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('accessToken', 'accessToken.character', '=', 'character.id')
        .where('character.id', charData.id)
  .then(([row]) => {
    if (row != null && row.account != null) {
      return handleOwnedChar(accountId, charData, charTokens, row);
    } else {
      return handleUnownedChar(accountId, charData, charTokens, row);
    }
  });
}

function handleOwnedChar(accountId, charData, charTokens, charRow) {
  let owningAccount = charRow.account;

  if (accountId != null && accountId != owningAccount) {
    throw new UserVisibleError(
        'This character has already been claimed by another account.');
  }
  return dao.upsertAccessTokens(
      charData.id,
      charTokens.refresh_token,
      charTokens.access_token,
      charTokens.expires_in)
  .then(() => {
    if (accountId == null) {
      logger.info('Now logged in as account', owningAccount);
    }
    return owningAccount;
  });
}

function handleUnownedChar(accountId, charData, charTokens, charRow) {
  logger.debug(
      'handleUnownedChar for charId=%s, accountId=%s',
      charData.id,
      accountId);

  return dao.transaction(function(trx) {
    let isNewAccount = accountId == null;

    return createOrUpdateCharacter(trx, charData, charTokens)
    .then(function() {
      if (isNewAccount) {
        return trx.createAccount()
        .then(newAccountId => {
          logger.info('Created new account with ID:', newAccountId);
          accountId = newAccountId;
        });
      }
    })
    .then(function() {
      return trx.ownCharacter(
          charData.id, accountId, /* isMain */ isNewAccount);
    });
  })
  .then(function() {
    return accountId;
  });
}

function createOrUpdateCharacter(trx, charData, charTokens) {
  let extraColumns = {};
  if (charData.corporationId != null) {
    extraColumns.corporationId = charData.corporationId;
  }

  return trx.upsertCharacter(charData.id, charData.name, extraColumns)
  .then(function() {
    return trx.upsertAccessTokens(
        charData.id,
        charTokens.refresh_token,
        charTokens.access_token,
        charTokens.expires_in);
  });
}
