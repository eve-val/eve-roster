import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../db/dao.js";
import { verify, string } from "../../../util/express/schemaVerifier.js";

import { BadRequestError } from "../../../error/BadRequestError.js";

export class PartialCitadelJson {
  name = string();
}
const inputSchema = new PartialCitadelJson();

export default jsonEndpoint((req, res, db, account, privs) => {
  const citadelId = parseInt(req.params.id);

  return Promise.resolve()
    .then(() => {
      privs.requireWrite("citadels");

      const body = verify(req.body, inputSchema);
      return dao.citadel.setName(db, citadelId, body.name);
    })
    .then((updateCount) => {
      if (updateCount == 0) {
        throw new BadRequestError(`No such citadel w/ id "${citadelId}`);
      }
      return {};
    });
});
