import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { verify, string, SchemaVerificationError, } from '../../../route-helper/schemaVerifier';

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
  })
  .catch(SchemaVerificationError, e => {
    throw new BadRequestError(e.message);
  });
});
