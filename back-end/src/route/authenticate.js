const axios = require('axios');
const express = require('express');
const querystring = require('querystring');

const configLoader = require('../config-loader');
const dao = require('../dao');
const eve = require('../eve');
const accountRoles = require('../data-source/accountRoles');
const UserVisibleError = require('../error/UserVisibleError');


const CONFIG = configLoader.load();
const SSO_AUTH_CODE =
      Buffer.from(CONFIG.ssoClientId + ':' + CONFIG.ssoSecretKey)
          .toString('base64');

const SAFE_CORP_ID = 98477920;  // TODO: Centralize this

module.exports = function(req, res) {
  console.log('~~~ Auth request ~~~');
  console.log('query:', req.query);

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
    console.log('accountId =', accountId);
    console.log('~~ Auth complete ~~');
    req.session.accountId = accountId;
    res.redirect('/');
  })
  .catch(e => {
    // TODO
    console.log(e);
    res.status(500);
    res.send('<pre>' + e.stack + '</pre>');
  });
};

function getAccessToken(queryCode) {
  console.log('Getting access tokens from auth code...');
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
    console.log('tokens:', response.data);
    return response.data;
  });
}

function getCharInfo(charTokens) {
  let characterId = 0;

  console.log('Getting auth info...');
  return axios.get('https://login.eveonline.com/oauth/verify', {
    headers: {
      'Authorization': 'Bearer ' + charTokens.access_token,
    },
  })
  .then(response => {
    console.log('Auth info:', response.data);

    characterId = response.data.CharacterID;

    console.log('Getting character info...');
    return eve.esi.character.get(characterId);
  })
  .then(charData => {
    console.log('Character info:', charData);

    charData.id = characterId;

    return charData;
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
      console.log('Now logged in as account', owningAccount);
    }
    return owningAccount;
  });
}

function handleUnownedChar(accountId, charData, charTokens, charRow) {
  console.log(
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
          console.log('Created new account with ID:', newAccountId);
          accountId = newAccountId;
        });
      }
    })
    .then(function() {
      return trx.ownCharacter(
          charData.id, accountId, /* isMain */ isNewAccount);
    })
    .then(function() {
      return accountRoles.updateAccount(trx, accountId);
    });
  })
  .then(function() {
    return accountId;
  });
}

function createOrUpdateCharacter(trx, charData, charTokens) {
  return trx.upsertCharacter(
      charData.id, charData.name, charData.corporation_id)
  .then(function() {
    return trx.upsertAccessTokens(
        charData.id,
        charTokens.refresh_token,
        charTokens.access_token,
        charTokens.expires_in);
  });
}
