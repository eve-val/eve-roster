import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { dao } from "../../../db/dao";
import { Tnex } from "../../../db/tnex/index";
import { AccountPrivileges } from "../../../infra/express/privileges";

import { BadRequestError } from "../../../error/BadRequestError";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../../infra/logging/buildLogger";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export default jsonEndpoint((req, res, db, account, privs) => {
  const characterId = parseInt(req.params.id);

  return Promise.resolve()
    .then(() => {
      if (req.body.opsec != undefined) {
        return setIsOpsec(db, account.id, privs, characterId, !!req.body.opsec);
      } else {
        return 0;
      }
    })
    .then(() => {
      return {};
    });
});

function setIsOpsec(
  db: Tnex,
  accountId: number,
  privs: AccountPrivileges,
  characterId: number,
  isOpsec: boolean
) {
  logger.debug(`setIsOpsec ${accountId} ${characterId} ${isOpsec}`);

  return dao.character.getCoreData(db, characterId).then((row) => {
    if (!row) {
      throw new BadRequestError(`Character not found: ${characterId}.`);
    }

    privs.requireWrite("characterIsOpsec", accountId == row.account_id);

    if (isOpsec && isMemberCorp(row.mcorp_membership)) {
      throw new BadRequestError(
        `Cannot set character ${characterId} to opsec: character is in an ` +
          `affiliated corp (${row.character_corporationId})`
      );
    }

    return dao.character.setCharacterIsOpsec(db, characterId, isOpsec);
  });
}

function isMemberCorp(membership: string | null) {
  return membership == "full" || membership == "affiliated";
}
