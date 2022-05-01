import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { number, verify } from "../../../../util/express/schemaVerifier.js";
import { AccountSummary } from "../../../../infra/express/getAccountPrivs.js";
import { AccountPrivileges } from "../../../../infra/express/privileges.js";
import { Tnex } from "../../../../db/tnex/index.js";
import { dao } from "../../../../db/dao.js";
import { BadRequestError } from "../../../../error/BadRequestError.js";
import { UnauthorizedClientError } from "../../../../error/UnauthorizedClientError.js";
import { getAccessToken } from "../../../../data-source/accessToken/accessToken.js";
import { fetchEsi } from "../../../../data-source/esi/fetch/fetchEsi.js";
import { ESI_UI_OPENWINDOW_INFORMATION } from "../../../../data-source/esi/endpoints.js";

export class Input {
  character = number();
  targetId = number();
}
const inputSchema = new Input();

export interface Output {}

/**
 * Given a character and entity ID, opens the info window for that entity in the
 * character's current game client. The requesting account must own the
 * character.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(db, account, privs, verify(req.body, inputSchema));
});

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
  input: Input
) {
  const row = await dao.character.getCoreData(db, input.character);
  if (row == null) {
    throw new BadRequestError(`No such character: ${input.character}.`);
  }
  if (row.account_id != account.id) {
    throw new UnauthorizedClientError(
      `Account ${account.id} doesn't own character ${input.character}.`
    );
  }
  // TODO: Catch errors below and throw a uservisible error
  const accessToken = await getAccessToken(db, input.character);
  await fetchEsi(ESI_UI_OPENWINDOW_INFORMATION, {
    target_id: input.targetId,
    _token: accessToken,
  });

  return {};
}
