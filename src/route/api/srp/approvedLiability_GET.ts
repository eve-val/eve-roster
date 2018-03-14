import Bluebird = require('bluebird');

import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { Tnex } from '../../../tnex';
import { AccountSummary } from '../../../route-helper/getAccountPrivs';
import { AccountPrivileges } from '../../../route-helper/privileges';
import { dao } from '../../../dao';

export interface Output {
  approvedLiability: number,
}


/**
 * Returns the sum of all approved but unpaid SRPs.
 */

export default jsonEndpoint(
    (req, res, db, account, privs): Bluebird<Output> => {

  return Bluebird.resolve(handleEndpoint(db, account, privs));
});

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
) {
  const row = await dao.srp.getApprovedLiability(db);

  return {
    approvedLiability: row && row.liability || 0,
  };
}
