import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../db/dao.js";
import { TIMEZONE_LABELS } from "../../../domain/roster/timezoneLabels.js";
import { verify, string } from "../../../util/express/schemaVerifier.js";
import { idParam } from "../../../util/express/paramVerifier.js";

import { BadRequestError } from "../../../error/BadRequestError.js";

export class Input {
  activeTimezone = string();
}
export const inputSchema = new Input();

export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  const targetAccountId = idParam(req, "id");

  const isOwner = targetAccountId == account.id;
  privs.requireWrite("memberTimezone", isOwner);

  return Promise.resolve()
    .then(() => {
      const input = verify(req.body, inputSchema);

      if (!TIMEZONE_LABELS.includes(input.activeTimezone)) {
        throw new BadRequestError(
          `Invalid timezone: "${input.activeTimezone}".`,
        );
      }
      return dao.account.setActiveTimezone(
        db,
        targetAccountId,
        input.activeTimezone,
      );
    })
    .then((updateCount) => {
      if (updateCount != 1) {
        throw new BadRequestError(`Invalid account id: "${req.params.id}".`);
      }
      return {};
    });
});
