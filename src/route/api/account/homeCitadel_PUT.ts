import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { dao } from "../../../db/dao";
import { verify, string } from "../../../util/express/schemaVerifier";
import { idParam } from "../../../util/express/paramVerifier";

import { BadRequestError } from "../../../error/BadRequestError";

export class Input {
  citadelName = string();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, privs) => {
  const targetAccountId = idParam(req, "id");
  const citadelName = verify(req.body, inputSchema).citadelName;

  const isOwner = targetAccountId == account.id;

  privs.requireWrite("memberHousing", isOwner);

  return Promise.resolve()
    .then(() => {
      return dao.citadel.getByName(db, citadelName, ["citadel_id"]);
    })
    .then((row) => {
      if (!row) {
        throw new BadRequestError("Unknown citadel: " + citadelName);
      }
      return dao.account.setHomeCitadel(db, targetAccountId, row.citadel_id);
    })
    .then(() => {
      return {};
    });
});
