import querystring = require('querystring');
import util = require('util');

import Promise = require('bluebird');
import axios from 'axios';
import express = require('express');

import { db as rootDb } from '../db';
import { dao } from '../dao';
import { Tnex, Nullable } from '../tnex';
import { isAnyEsiError } from '../util/error';

import esi from '../esi';
import { UserVisibleError } from '../error/UserVisibleError';

const logger = require('../util/logger')(__filename);


const SSO_AUTH_CODE =
      Buffer.from(process.env.SSO_CLIENT_ID + ':' + process.env.SSO_SECRET_KEY)
          .toString('base64');

interface AccessToken {
  access_token: string,
  refresh_token: string,
  expires_in: number,
}

interface CharacterInfo {
  id: number,
  name: string,
  scopes: string,
  corporationId: number | null,
}

export default function(req: express.Request, res: express.Response) {
  logger.info('~~~ Auth request ~~~');

  let accountId: number | undefined = req.session.accountId;
  let charTokens: AccessToken;
  let charData;

  return Promise.resolve()
  .then(() => {
    logger.info(`  Getting access token from request code ${req.query.code}`);
    return getAccessToken(req.query.code)
  })
  .then(_charTokens => {
    logger.info(
        `  Getting char data via access token ${_charTokens.access_token}`);
    charTokens = _charTokens;
    return getCharInfo(charTokens);
  })
  .then(characterData => {
    logger.info(`  Character: ${characterData.name}`);

    charData = characterData;
    return handleCharLogin(rootDb, accountId, charData, charTokens);
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

function getAccessToken(queryCode: string): Promise<AccessToken> {
  return Promise.resolve()
  .then(() => {
    return axios.post(
      'https://login.eveonline.com/oauth/token',
      querystring.stringify({
        grant_type: 'authorization_code',
        code: queryCode,
      }), {
        headers: {
          'Authorization': 'Basic ' + SSO_AUTH_CODE,
        },
      });
  })
  .then(response => {
    return response.data;
  });
}

function getCharInfo(charTokens: AccessToken): Promise<CharacterInfo> {
  let charData: CharacterInfo;

  logger.debug(`    Getting basic char+auth info...`);
  return Promise.resolve()
  .then(() => {
    return axios.get('https://login.eveonline.com/oauth/verify', {
      headers: {
        'Authorization': 'Bearer ' + charTokens.access_token,
      },
    })
  })
  .then(response => {
    charData = {
      id: response.data.CharacterID,
      name: response.data.CharacterName,
      scopes: response.data.Scopes,
      corporationId: null,
    }

    logger.debug(`    Getting character's corporation (ESI)...`);
    return esi.characters(charData.id).info()
    .then(esiCharData => {
      charData.corporationId = esiCharData.corporation_id;
    })
    .catch(e => {
      if (isAnyEsiError(e)) {
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

function handleCharLogin(
    db: Tnex,
    accountId: number | undefined,
    charData: CharacterInfo,
    charTokens: AccessToken,
    ) {

  return dao.character.getCoreData(db, charData.id)
  .then(row => {
    if (row == null || row.account_id == null) {
      logger.info(`  Character is unowned.`);
      return handleUnownedChar(db, accountId, charData, charTokens);

    } else {
      logger.info(`  Character already owned.`);
      return handleOwnedChar(
          db, accountId, charData, charTokens, row.account_id);
    }
  });
}

function handleOwnedChar(
    db: Tnex,
    accountId: number | undefined,
    charData: CharacterInfo,
    charTokens: AccessToken,
    owningAccount: number,
    ) {

  return Promise.resolve()
  .then(() => {
    if (accountId != null && accountId != owningAccount) {
      logger.info(`  Adding pending ownership request for character`
          + `${charData.id} to account ${accountId}`);
      return dao.ownership.createPendingOwnership(db, charData.id, accountId)
    }
  })
  .then(() => {
    return dao.accessToken.upsert(
        db,
        charData.id,
        charTokens.refresh_token,
        charTokens.access_token,
        charTokens.expires_in);
  })
  .then(() => {
    if (accountId == null) {
      logger.info(`  Now logged in as account ${owningAccount}`);
      return owningAccount;
    } else {
      return accountId;
    }
  });
}

function handleUnownedChar(
    db: Tnex,
    accountId: number | undefined,
    charData: CharacterInfo,
    charTokens: AccessToken) {
  logger.debug(
      `  handleUnownedChar for charId=${charData.id}, accountId=${accountId}`);

  if (charData.corporationId == null) {
    throw new UserVisibleError(
        `Corporation lookup failed for new character. ESI is probably `
        + `experiencing flakiness. Please try again.`);
  }

  return db.transaction(db => {
    return Promise.resolve()
    .then(() => {
      return createOrUpdateCharacter(db, charData, charTokens);
    })
    .then(() => {
      if (accountId == undefined) {
        return dao.account.create(db, charData.id)
        .then(newAccountId => {
          logger.info('  Created new account with ID:', newAccountId);
          return newAccountId;
        })
      } else {
        return accountId;
      }
    })
    .then(finalAccountId => {
      return dao.ownership.ownCharacter(
          db,
          charData.id,
          finalAccountId,
          accountId == null /* isMain */)
      .then(() => finalAccountId);
    });
  })
  .then(finalAccountId => {
    return finalAccountId;
  });
}

function createOrUpdateCharacter(
    db: Tnex,
    charData: CharacterInfo,
    charTokens: AccessToken,
    ) {

  return Promise.resolve()
  .then(() => {
    return dao.character.getCoreData(db, charData.id)
    .then(row => {
      if (row) {
        return dao.character.updateCharacter(db, charData.id, {
          character_id: charData.id,
          character_name: charData.name,
          character_corporationId: assertHasValue(charData.corporationId),
        })
        .then(_ => {});
      } else {
        return dao.character.upsertCharacter(db, {
          character_id: charData.id,
          character_name: charData.name,
          character_corporationId: assertHasValue(charData.corporationId),
          // TODO: Consider moving these to another table
          character_titles: null,
          character_startDate: null,
          character_logonDate: null,
          character_logoffDate: null,
          character_siggyScore: null,
        });
      }
    })
  })
  .then(() => {
    return dao.accessToken.upsert(
        db,
        charData.id,
        charTokens.refresh_token,
        charTokens.access_token,
        charTokens.expires_in);
  })
}

function assertHasValue<T>(value: T | null | undefined) {
  if (value == null) {
    throw new Error('Value cannot be null.');
  }
  return value;
}