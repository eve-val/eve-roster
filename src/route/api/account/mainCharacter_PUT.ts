import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { dao } from "../../../db/dao";
import { idParam } from "../../../util/express/paramVerifier";
import { verify, number } from "../../../util/express/schemaVerifier";
import { canDesignateMain } from "../../../domain/account/canDesignateMain";
import { CORP_DOOMHEIM } from "../../../shared/eveConstants";

import { BadRequestError } from "../../../error/BadRequestError";
import { UnauthorizedClientError } from "../../../error/UnauthorizedClientError";

export class Input {
  characterId = number();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, _privs) => {
  const targetAccountId = idParam(req, "id");
  const newMainId = verify(req.body, inputSchema).characterId;

  return Promise.resolve()
    .then(() => {
      const isOwner = targetAccountId == account.id;
      if (!isOwner) {
        throw new UnauthorizedClientError("Not the right owner.");
      }
      return dao.account.getDetails(db, account.id);
    })
    .then((row) => {
      if (row == null) {
        throw new BadRequestError(`Cannot find account "${targetAccountId}".`);
      }

      const created = row.account_created;
      if (!canDesignateMain(created)) {
        throw new UnauthorizedClientError(
          `Account was created ${created}, which is outside this account's` +
            ` main designation window.`
        );
      }
      return dao.character.getCoreData(db, newMainId);
    })
    .then((charData) => {
      if (charData == null) {
        throw new BadRequestError(`No such character: ${newMainId}.`);
      }
      if (charData.account_id != account.id) {
        throw new BadRequestError(
          `Account ${account.id} doesn't own character ${newMainId}`
        );
      }
      if (charData.character_corporationId == CORP_DOOMHEIM) {
        throw new BadRequestError(`Cannot set biomassed character as main.`);
      }

      return dao.account.setMain(db, account.id, newMainId);
    })
    .then(() => {
      return {};
    });
});
