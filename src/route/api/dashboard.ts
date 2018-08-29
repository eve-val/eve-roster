import { dao } from '../../db/dao';
import { NotFoundError } from '../../error/NotFoundError';
import { jsonEndpoint } from '../../express/protectedEndpoint';
import { loadSummarizedQueue, SkillQueueSummary } from '../../domain/skills/skillQueueSummarizer';
import { parallelize } from '../../util/asyncUtil';
import * as ccpSso from '../../domain/sso/loginParams';
import { canDesignateMain } from '../../domain/account/canDesignateMain';

interface Output {
  accountId: number,
  characters: CharacterJson[],
  transfers: { character: number, name: string }[],
  loginParams: string,
  mainCharacter: number,
  access: {
    designateMain: number,
    isMember: boolean,
  },
}

interface CharacterJson {
  id: number,
  name: string,
  opsec: boolean,
  corpStatus: string,
  skillQueue: SkillQueueSummary,
  corpId: number,
  needsReauth: boolean,
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  let mainCharacter: number;

  let characters = [] as CharacterJson[];
  let access = {
    designateMain: 0,
    isMember: privs.isMember(),
  };

  return Promise.resolve()
  .then(() => {
    return dao.account.getDetails(db, account.id);
  })
  .then(row => {
    if (row == null) {
      throw new NotFoundError();
    }

    mainCharacter = row.account_mainCharacter;
    access.designateMain = canDesignateMain(row.account_created) ? 2 : 0;

    return dao.character.getCharactersOwnedByAccount(db, account.id)
  })
  .then(rows => {
    return parallelize(rows, row => {
      return loadSummarizedQueue(db, row.character_id, 'cached')
      .then(queue => {
        return {
          id: row.character_id,
          name: row.character_name,
          opsec: row.ownership_opsec && privs.isMember(),
          corpStatus: getCorpStatus(row.memberCorporation_membership),
          skillQueue: queue,
          corpId: row.character_corporationId,
          needsReauth: row.accessToken_needsUpdate !== false,
        };
      });
    });
  })
  .then(_characters => {
    characters = _characters;

    return dao.ownership.getAccountPendingOwnership(db, account.id);
  })
  .then(transfers => {
    let strippedTransfers = transfers.map(transfer => ({
      character: transfer.pendingOwnership_character,
      name: transfer.character_name,
    }));

    return {
      accountId: account.id,
      characters: characters,
      transfers: strippedTransfers,
      loginParams: ccpSso.LOGIN_PARAMS,
      mainCharacter: mainCharacter,
      access: access,
    };
  });
});

function getCorpStatus(membership: string | null) {
  // TODO: Push this schema all the way down to the client and remove the need
  // for this transform
  switch (membership) {
    case 'full':
      return 'primary';
    case 'affiliated':
      return 'alt';
    default:
      return 'external';
  }
}
