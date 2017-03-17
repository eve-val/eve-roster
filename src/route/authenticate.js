const axios = require('axios');
const express = require('express');
const querystring = require('querystring');
const util = require('util');

const Promise = require('bluebird');

const dao = require('../dao');
const error = require('../util/error');
const eve = require('../eve');
const accountRoles = require('../data-source/accountRoles');
const UserVisibleError = require('../error/UserVisibleError');


const logger = require('../util/logger')(__filename);

const SSO_AUTH_CODE =
      Buffer.from(process.env.SSO_CLIENT_ID + ':' + process.env.SSO_SECRET_KEY)
          .toString('base64');

module.exports = function(req, res) {
  logger.info('~~~ Auth request ~~~');

  let charTokens;
  let charData;

  return Promise.resolve()
  .then(() => {
    logger.info(`  Getting access token from request code ${req.query.code}`);
    return getAccessToken(req.query.code)
  })
  .then(characterTokens => {
    logger.info(
        `  Getting char data via access token ${characterTokens.access_token}`);
    charTokens = characterTokens;
    return getCharInfo(charTokens);
  })
  .then(characterData => {
    logger.info(`  Character: ${characterData.name}`);

    charData = characterData;
    return handleCharLogin(req.session.accountId, charData, charTokens);
  })
  .then(accountId => {
    logger.info('  accountId =', accountId);
    logger.info('~~ Auth complete ~~');
    req.session.accountId = accountId;
    res.redirect('/');
  })
  .catch(e => {
    let message = (e instanceof UserVisibleError) ? e.message : 'Server error';
    logger.error('Auth failure');
    logger.error(e);
    res.status(500);
    res.send(message);
  });
};

function getAccessToken(queryCode) {
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

  logger.debug(`    Getting basic char+auth info...`);
  return axios.get('https://login.eveonline.com/oauth/verify', {
    headers: {
      'Authorization': 'Bearer ' + charTokens.access_token,
    },
  })
  .then(response => {
    charData.id = response.data.CharacterID;
    charData.name = response.data.CharacterName;
    charData.scopes = response.data.Scopes;

    logger.debug(`    Getting character's corporation (ESI)...`);
    return eve.esi.characters(charData.id).info()
    .then(esiCharData => {
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
      logger.info(
          `  Character already owned. Logging in as account ${row.account.id}`);
      return handleOwnedChar(accountId, charData, charTokens, row);
    } else {
      logger.info(`  Character is unowned.`);
      return handleUnownedChar(accountId, charData, charTokens, row);
    }
  });
}

function handleOwnedChar(accountId, charData, charTokens, charRow) {
  let owningAccount = charRow.account;

  if (accountId != null && accountId != owningAccount) {
    throw new UserVisibleError(
        'This character has already been claimed by another account.'
            + ' You may have accidentally created multiple accounts. Please'
            + ' contact an admin to merge them for you.');
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
      `  handleUnownedChar for charId=${charData.id}, accountId=${accountId}`);

  return dao.transaction(function(trx) {
    let isNewAccount = accountId == null;

    return createOrUpdateCharacter(trx, charData, charTokens)
    .then(function() {
      if (isNewAccount) {
        return trx.createAccount()
        .then(newAccountId => {
          logger.info('  Created new account with ID:', newAccountId);
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
