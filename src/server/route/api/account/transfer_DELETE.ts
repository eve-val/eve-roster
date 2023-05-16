import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../db/dao.js";
import { idParam } from "../../../util/express/paramVerifier.js";

import { UnauthorizedClientError } from "../../../error/UnauthorizedClientError.js";

export default jsonEndpoint((req, res, db, account, _privs): Promise<{}> => {
  const targetAccountId = idParam(req, "id");
  const charId = idParam(req, "charId");

  return Promise.resolve()
    .then(() => {
      const isOwner = targetAccountId == account.id;
      if (!isOwner) {
        throw new UnauthorizedClientError("Not the right owner.");
      }

      return dao.ownership.deletePendingOwnership(db, account.id, charId);
    })
    .then((_deleteCount) => {
      return {};
    });
});
