
import { jsonEndpoint } from '../../../infra/express/protectedEndpoint';
import { dao } from '../../../db/dao';
import { TIMEZONE_LABELS } from '../../../domain/roster/timezoneLabels';
import { verify, string } from '../../../route-helper/schemaVerifier';
import { idParam } from '../../../route-helper/paramVerifier';

import { BadRequestError } from '../../../error/BadRequestError';


export class Input {
  activeTimezone = string();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  let targetAccountId = idParam(req, 'id');

  let isOwner = targetAccountId == account.id;
  privs.requireWrite('memberTimezone', isOwner);

  return Promise.resolve()
  .then(() => {
    let input = verify(req.body, inputSchema);

    if (!TIMEZONE_LABELS.includes(input.activeTimezone)) {
      throw new BadRequestError(`Invalid timezone: "${input.activeTimezone}".`);
    }
    return dao.account.setActiveTimezone(
        db, targetAccountId, input.activeTimezone);
  })
  .then(updateCount => {
    if (updateCount != 1) {
      throw new BadRequestError(`Invalid account id: "${req.params.id}".`);
    }
    return {};
  });
});
