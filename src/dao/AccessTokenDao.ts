import Promise = require('bluebird');

import { Tnex, val, toNum } from '../tnex';
import { Dao } from '../dao';
import { accessToken, AccessToken } from '../dao/tables';

export default class AccessTokenDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getForCharacter(db: Tnex, characterId: number) {
    return db
        .select(accessToken)
        .where('accessToken_character', '=', val(characterId))
        .columns(
            'accessToken_refreshToken',
            'accessToken_accessToken',
            'accessToken_accessTokenExpires',
            'accessToken_needsUpdate',
            )
        .fetchFirst();
  }

  updateForCharacter(
      db: Tnex,
      characterId: number,
      row: TokenUpdate) {
    return db
        .update(accessToken, {
          accessToken_accessToken: row.accessToken_accessToken,
          accessToken_accessTokenExpires: row.accessToken_accessTokenExpires,
          accessToken_needsUpdate: false,
        })
        .where('accessToken_character', '=', val(characterId))
        .run();
  }

  markAsExpired(db: Tnex, characterId: number) {
    return db
        .update(accessToken, {
          accessToken_needsUpdate: true
        })
        .where('accessToken_character', '=', val(characterId))
        .run()
    .then(updateCount => {
      if (updateCount != 1) {
        throw new Error(`No token to update for character ${characterId}.`);
      }
    })
  }

  upsert(
      db: Tnex,
      characterId: number,
      refreshToken: string,
      accessTokenVal: string,
      expiresIn: number,
      ) {

    return db.upsert(accessToken, {
      accessToken_character: characterId,
      accessToken_refreshToken: refreshToken,
      accessToken_accessToken: accessTokenVal,
      accessToken_accessTokenExpires: Date.now() + expiresIn * 1000,
      accessToken_needsUpdate: false,
    }, 'accessToken_character');
  }
}

export type TokenUpdate =
    Pick<
        AccessToken,
        'accessToken_accessToken' | 'accessToken_accessTokenExpires'>;
