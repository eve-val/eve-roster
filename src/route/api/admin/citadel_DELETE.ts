import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { dao } from "../../../db/dao";
import { BadRequestError } from "../../../error/BadRequestError";

export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  const citadelId = parseInt(req.params.id);

  privs.requireWrite("citadels");

  return Promise.resolve()
    .then(() => {
      return dao.citadel.drop(db, citadelId);
    })
    .then((dropCount) => {
      if (dropCount == 0) {
        throw new BadRequestError(`Citadel not found: ${citadelId}.`);
      }
      return {};
    });
});
