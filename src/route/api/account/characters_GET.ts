import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { Tnex } from '../../../tnex/index';
import { AccountSummary } from '../../../route-helper/getAccountPrivs';
import { AccountPrivileges } from '../../../route-helper/privileges';
import { idParam } from '../../../route-helper/paramVerifier';
import { UnauthorizedClientError } from '../../../error/UnauthorizedClientError';
import { dao } from '../../../dao';


export type Output = CharacterDescription[];

export interface CharacterDescription {
  id: number,
  name: string,
  corporation: number,
  membership: string | null,
  accessTokenValid: boolean,
  isMain: boolean,
}


/**
 * Returns a list of all characters owned by a particular account. Currently,
 * accounts can only ask about their own characters.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  const targetAccountId = idParam(req, 'id');

  return handleEndpoint(db, account, privs, targetAccountId);
});

async function handleEndpoint(
    db: Tnex,
    account: AccountSummary,
    privs: AccountPrivileges,
    targetAccount: number,
) {
  // TODO: Allow other accounts to read if they have the right privs
  if (targetAccount != account.id) {
    throw new UnauthorizedClientError(
        `Account ${account.id} cannot read characters of account`
        + `${targetAccount}.`);
  }

  const rows =
      await dao.character.getCharactersOwnedByAccount(db, targetAccount);

  let chars: CharacterDescription[] = [];
  for (let row of rows) {
    let char = {
      id: row.character_id,
      name: row.character_name,
      corporation: row.character_corporationId,
      membership: row.memberCorporation_membership,
      accessTokenValid: !row.accessToken_needsUpdate,
      isMain: row.character_id == row.account_mainCharacter,
    };
    if (char.isMain) {
      chars.unshift(char);
    } else {
      chars.push(char);
    }
  }

  return chars;
}
