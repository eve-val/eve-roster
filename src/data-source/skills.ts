import { Tnex } from '../tnex';
import { dao } from '../dao';

import { getAccessTokenForCharacter } from './accessToken';
import { default as esi } from '../esi';

const logger = require('../util/logger')(__filename);


/** Throws MissingTokenError and ESI failure errors. */
export function updateSkills(db: Tnex, characterId: number) {
  // TODO: Incorporate completed skills in skill queue here
  return getAccessTokenForCharacter(db, characterId)
  .then(accessToken => {
    return esi.characters(characterId, accessToken).skills();
  })
  .then(data => {
    return data.skills;
  })
  .then(esiSkills => {
    logger.debug(`Inserting ${esiSkills.length} skills for character ` +
        `${characterId}...`);
    return db.transaction(db => {
      return dao.skillsheet.set(db, characterId, esiSkills.map(esiSkill => {
        return {
          skillsheet_character: characterId,
          skillsheet_skill: esiSkill.skill_id,
          skillsheet_level: esiSkill.current_skill_level,
          skillsheet_skillpoints: esiSkill.skillpoints_in_skill,
        };
      }))
    });
  });
}
