import { jsonEndpoint } from '../../../express/protectedEndpoint';
import { dao } from '../../../db/dao';
import { idParam } from '../../../route-helper/paramVerifier';

import { UnauthorizedClientError } from '../../../error/UnauthorizedClientError';


export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  const targetAccountId = idParam(req, 'id');
  const charId = idParam(req, 'charId');

  return Promise.resolve()
  .then(() => {
    const isOwner = targetAccountId == account.id;
    if (!isOwner) {
      throw new UnauthorizedClientError('Not the right owner.');
    }

    return dao.ownership.deletePendingOwnership(db, account.id, charId);
  })
  .then(deleteCount => {
    return {};
  });
});
