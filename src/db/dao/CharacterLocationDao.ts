import { Dao } from '../dao';
import { Tnex, val } from '../../db/tnex';
import { characterLocation, CharacterLocation, memberCorporation, character, accessToken } from '../tables';

export default class LocationDao {
  constructor(
      private _parent: Dao,
      ) {
  }

  getMostRecentMemberCharacterLocations(db: Tnex) {
    return db
        .select(memberCorporation)
        .join(character,
            'character_corporationId', '=', 'memberCorporation_corporationId')
        .join(characterLocation, 'charloc_character', '=', 'character_id')
        .distinctOn('charloc_character')
        .orderBy('charloc_character', 'desc')
        .orderBy('charloc_timestamp', 'desc')
        .columns(
            'charloc_shipTypeId',
            'charloc_shipItemId',
            'charloc_shipName',
            'charloc_solarSystemId',
            'charloc_timestamp',
            )
        .run();
  }

  getMemberCharactersWithValidAccessTokens(db: Tnex) {
    return db
        .select(memberCorporation)
        .join(character,
            'character_corporationId', '=', 'memberCorporation_corporationId')
        .join(accessToken, 'accessToken_character', '=', 'character_id')
        .where('accessToken_needsUpdate', '=', val(false))
        .columns(
            'accessToken_character',
            'accessToken_accessToken',
            'accessToken_accessTokenExpires',
            'accessToken_refreshToken',
            )
        .run();
  }

  storeAll(db: Tnex, rows: CharacterLocation[]) {
    return db
        .insertAll(characterLocation, rows);
  }

  deleteOldLocations(db: Tnex, cutoff: number) {
    return db
        .del(characterLocation)
        .where('charloc_timestamp', '<', val(cutoff))
        .run();
  }
}
