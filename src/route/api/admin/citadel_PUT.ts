import { jsonEndpoint } from '../../../infra/express/protectedEndpoint';
import { dao } from '../../../db/dao';
import { verify, string, } from '../../../util/express/schemaVerifier';

import { BadRequestError } from '../../../error/BadRequestError';

export class PartialCitadelJson {
  name = string();
}
const inputSchema = new PartialCitadelJson();

export default jsonEndpoint((req, res, db, account, privs) => {
  let citadelId = parseInt(req.params.id);

  return Promise.resolve()
  .then(() => {
    privs.requireWrite('citadels');

    let body = verify(req.body, inputSchema);
    return dao.citadel.setName(db, citadelId, body.name);
  })
  .then(updateCount => {
    if (updateCount == 0) {
      throw new BadRequestError(`No such citadel w/ id "${citadelId}`);
    }
    return {};
  });
});
