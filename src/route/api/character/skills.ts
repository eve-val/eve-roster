import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { Tnex } from '../../../tnex';

import { isAnyEsiError } from '../../../util/error';
import { getAccessTokenForCharacter } from '../../../data-source/accessToken';
import { updateSkills } from '../../../data-source/skills';
import { MissingTokenError } from '../../../error/MissingTokenError';
import esi from '../../../esi';

const STATIC = require('../../../static-data').get();
const logger = require('../../../util/logger')(__filename);

export interface Payload {
  skills: SkillJson[],
  warning?: string,
}

export interface SkillJson {
  id: number,
  name: string,
  group: number,
  level: number,
  sp: number,
}

export default jsonEndpoint(function(req, res, db, account, privs)
    : Promise<Payload> {
  let characterId: number = parseInt(req.params.id);

  return dao.character.getOwner(db, characterId)
  .then(row => {
    let owningAccount = row && row.account_id;
    privs.requireRead('characterSkills', account.id == owningAccount);
  })
  .then(() => {
    return fetchSkills(db, characterId);
  })
});

function fetchSkills(db: Tnex, characterId: number) {
  return updateSkills(db, characterId)
  .then(() => {
    return loadSkillsFromDb(db, characterId);
  })
  .catch(e => {
    let isEsiFailure = isAnyEsiError(e);
    if (isEsiFailure || e instanceof MissingTokenError) {
      // This error is thrown only in fetchNewSkills so execute the DB load
      // that was never reached and wrap the result in a warning message.
      return loadSkillsFromDb(db, characterId)
      .then(skills => {
        if (isEsiFailure) {
          skills.warning = 'ESI request failed. Skills are out of date.';
        } else {
          skills.warning =
              'Missing access token for character. Skills are out of date.';
        }
        return skills;
      });
    } else {
      // Unknown failure
      throw e;
    }
  })
}

function loadSkillsFromDb(db: Tnex, characterId: number): Promise<Payload> {
  return dao.skillsheet.get(db, characterId)
  .then(rows => {
    let skillList = [] as SkillJson[];
    for (let i = 0; i < rows.length; i++) {
      let row = rows[i];
      skillList.push({
        id: row.skillsheet_skill,
        name: STATIC.SKILLS[row.skillsheet_skill].name,
        group: STATIC.SKILLS[row.skillsheet_skill].groupId,
        level: row.skillsheet_level,
        sp: row.skillsheet_skillpoints,
      });
    }

    return {
        skills: skillList,
        warning: undefined,
    };
  });
}
