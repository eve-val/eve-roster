const axios = require('axios');
const express = require('express');
const request = require('request');

const configLoader = require('../config-loader');
const dao = require('../dao');
const esi = require('../esi');


const CONFIG = configLoader.load();
const SSO_AUTH_CODE =
      Buffer.from(CONFIG.ssoClientId + ':' + CONFIG.ssoSecretKey)
          .toString('base64');

const SAFE_CORP_ID = 98477920;  // TODO: Centralize this

module.exports = function(req, res) {
  console.log('AUTH QUERY:', req.query);

  request.post('https://login.eveonline.com/oauth/token', {
    headers: {
      'Authorization': 'Basic ' + SSO_AUTH_CODE,
    },
    form: {
      grant_type: 'authorization_code',
      code: req.query.code,
    }
  }, function(error, response, body) {
    if (!error && response.statusCode == 200) {
      handleAccessToken(req, res, body);
    } else {
      console.error('Something bad happened while trying to get an auth token:',
          error, response.statusCode, body);
      // TODO show something to the user
      res.send('ERROR :(');
    }
  });
};

function handleAccessToken(req, res, body) {
  let charTokens = JSON.parse(body);
  let accessToken = charTokens.access_token;

  let characterId = 0;
  let characterBasicInfo = null;

  console.log('Auth successful! Auth token is %s', charTokens.access_token);
  console.log('  Full response:', charTokens);

  let work =
  axios.get('https://login.eveonline.com/oauth/verify', {
    headers: {
      'Authorization': 'Bearer ' + charTokens.access_token,
    },
  })
  .then(function(response) {
    console.log('VERIFY CHAR', response.data);
    characterId = response.data.CharacterID;
    return esi.getNoAuth('characters/' + characterId + '/', accessToken);
  })
  .then(function(response) {
    console.log('ESI CHAR', response.data);
    characterBasicInfo = response.data;

    return handleCharLogin(
          req, res, characterId, characterBasicInfo, charTokens);
  })
  .catch(function(err) {
    console.log('THERE WAS AN ERROR', err);
    res.send('ERROR :(' + '\n' + err);
  });
}

function getEsi(path, accessToken) {
  return axios.get('https://esi.tech.ccp.is/latest/' + path, {
    headers: {
      'Authorization': 'Bearer ' + accessToken,
    },
  });
}

function handleCharLogin(req, res, charId, charData, charTokens) {
  return dao.builder('character')
        .select(
            'character.name', 'ownership.account', 'accessToken.needsUpdate')
        .leftJoin('ownership', 'ownership.character', '=', 'character.id')
        .leftJoin('accessToken', 'accessToken.character', '=', 'character.id')
        .where('character.id', charId)
  .then(function(charRows) {
    console.log('charRows:', charRows);
    if (charRows.length > 0 && charRows[0].account != null) {
      return handleOwnedChar(req, res, charId, charTokens, charRows[0]);
    } else {
      return handleUnownedChar(
          req, res, charId, charData, charTokens, charRows[0]);
    }
  });
}

function handleOwnedChar(req, res, charId, charTokens, charRow) {
  let owningAccount = charRow.account;

  if (req.session.accountId != null && req.session.accountId != owningAccount) {
    throw new Error(
        'This character has already been claimed by another account.');
  }
  dao.updateAccessTokens(
      charId,
      charTokens.refresh_token,
      charTokens.access_token,
      charTokens.expires_in)
  .then(() => {
    if (req.session.accountId == null) {
      req.session.accountId = owningAccount;
      console.log('Now logged in as account', req.session.accountId);
    }
    res.redirect('/');
  });
}

function handleUnownedChar(req, res, charId, charData, charTokens, charRow) {
  console.log(
      'handleUnownedChar for charId=%s, accountId=%s',
      charId,
      req.session.accountId);

  let accountId = req.session.accountId;

  return dao.transaction()
  .then(function(trx) {
    let isNewAccount = accountId == null;

    return createOrUpdateCharacter(trx, charId, charData, charTokens, charRow)
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
      return trx.ownCharacter(charId, accountId, /* isMain */ isNewAccount);
    })
    .then(function() {
      trx.commit();
    })
    .catch(function(err) {
      trx.rollback();
      throw err;
    });
  })
  .then(function() {
    req.session.accountId = accountId;
    res.redirect('/');
  });
}

function createOrUpdateCharacter(trx, charId, charData, charTokens, charRow) {
  if (!charRow) {
    // Create character
    return trx
        .createCharacter(charId, charData.name, charData.corporation_id)
    .then(function() {
      return trx.createAccessTokens(
          charId,
          charTokens.refresh_token,
          charTokens.access_token,
          charTokens.expires_in);
    });
  } else {
    // Just update in-place
    return trx.builder('character')
        .where('id', '=', charId)
        .update({
          corporationId: charData.corporation_id
        })
    .then(function() {
      return trx.updateAccessTokens(
          charId,
          charTokens.refresh_token,
          charTokens.access_token,
          charTokens.expires_in);
    });
  }
}