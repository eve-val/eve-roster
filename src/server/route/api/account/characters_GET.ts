import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { Tnex } from "../../../db/tnex/index.js";
import { AccountSummary } from "../../../infra/express/getAccountPrivs.js";
import { AccountPrivileges } from "../../../infra/express/privileges.js";
import { idParam } from "../../../util/express/paramVerifier.js";
import { UnauthorizedClientError } from "../../../error/UnauthorizedClientError.js";
import { dao } from "../../../db/dao.js";
import { Account_Characters_GET, CharacterDescription } from "../../../../shared/route/api/account/characters_GET.js";

/**
 * Returns a list of all characters owned by a particular account. Currently,
 * accounts can only ask about their own characters.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Account_Characters_GET> => {
  const targetAccountId = idParam(req, "id");

  return handleEndpoint(db, account, privs, targetAccountId);
});

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
  targetAccount: number
) {
  // TODO: Allow other accounts to read if they have the right privs
  if (targetAccount != account.id) {
    throw new UnauthorizedClientError(
      `Account ${account.id} cannot read characters of account` +
        `${targetAccount}.`
    );
  }

  const rows = await dao.character.getCharactersOwnedByAccount(
    db,
    targetAccount
  );

  const chars: CharacterDescription[] = [];
  for (const row of rows) {
    const char = {
      id: row.character_id,
      name: row.character_name,
      corporation: row.character_corporationId,
      membership: row.mcorp_membership,
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
