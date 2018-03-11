import Bluebird = require('bluebird');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { number, verify, string, nullable, stringEnum } from '../../../../route-helper/schemaVerifier';
import { AccountSummary } from '../../../../route-helper/getAccountPrivs';
import { AccountPrivileges } from '../../../../route-helper/privileges';
import { Tnex } from '../../../../tnex';
import { dao } from '../../../../dao';
import { BadRequestError } from '../../../../error/BadRequestError';
import { SrpVerdictStatus, SrpVerdictReason } from '../../../../dao/enums';
import { NotFoundError } from '../../../../error/NotFoundError';
import { idParam } from '../../../../route-helper/paramVerifier';

export class Input {
  verdict = stringEnum<SrpVerdictStatus>(SrpVerdictStatus);
  reason = nullable(stringEnum<SrpVerdictReason>(SrpVerdictReason));
  payout = number();
}
const inputSchema = new Input();

export interface Output {}


/**
 * Sets the SRP verdict for a particular loss (i.e. approved or ineligible).
 */
export default jsonEndpoint(
    (req, res, db, account, privs): Bluebird<Output> => {

  return Bluebird.resolve(handleEndpoint(
      db, account, privs, idParam(req, 'id'), verify(req.body, inputSchema)))
});

async function handleEndpoint(
    db: Tnex,
    account: AccountSummary,
    privs: AccountPrivileges,
    id: number,
    input: Input,
) {
  privs.requireWrite('srp');

  if (input.verdict == SrpVerdictStatus.INELIGIBLE) {
    if (input.reason == null) {
      throw new BadRequestError(
          `Reason must be specified if status is ineligible.`);
    } else if (input.reason == SrpVerdictReason.OUTSIDE_JURISDICTION
        || input.reason == SrpVerdictReason.NO_RECIPIENT) {
      throw new BadRequestError(
          `Only the system may specify this reason.`);
    }
  }
  if (input.verdict != SrpVerdictStatus.INELIGIBLE && input.reason != null) {
    throw new BadRequestError(
        `Reason must be null if status not ineligible.`);
  }

  const updateCount = await dao.srp.setSrpVerdict(
      db, id, input.verdict, input.reason, input.payout, account.id)

  if (updateCount != 1) {
    throw new NotFoundError();
  }

  return {};
}
