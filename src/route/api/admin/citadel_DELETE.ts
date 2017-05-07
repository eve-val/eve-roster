import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { BadRequestError } from '../../../error/BadRequestError';

export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  let citadelId = parseInt(req.params.id);

  privs.requireWrite('citadels');

  return dao.citadel.drop(db, citadelId)
  .then(dropCount => {
    if (dropCount == 0) {
      throw new BadRequestError(`Citadel not found: ${citadelId}.`);
    }
    return {};
  });
});
