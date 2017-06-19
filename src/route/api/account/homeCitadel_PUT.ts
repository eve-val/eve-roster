import Promise = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { dao } from '../../../dao';
import { verify, string } from '../../../route-helper/schemaVerifier';
import { idParam } from '../../../route-helper/paramVerifier';

import { BadRequestError } from '../../../error/BadRequestError';

export class Input {
  citadelName = string();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, privs) => {
  const targetAccountId = idParam(req, 'id');
  const citadelName = verify(req.body, inputSchema).citadelName;

  const isOwner = targetAccountId == account.id;

  privs.requireWrite('memberHousing', isOwner);

  return dao.citadel.getByName(db, citadelName, ['citadel_id'])
  .then(row => {
    if (!row) {
      throw new BadRequestError('Unknown citadel: ' + citadelName);
    }
    return dao.account.setHomeCitadel(db, targetAccountId, row.citadel_id);
  })
  .then(() => {
    return {};
  });
});
