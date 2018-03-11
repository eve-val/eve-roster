import Bluebird = require('bluebird');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { Tnex } from '../../../../tnex';
import { AccountSummary } from '../../../../route-helper/getAccountPrivs';
import { AccountPrivileges } from '../../../../route-helper/privileges';
import { dao } from '../../../../dao';


export interface Output {
  srpJurisdiction: { start: number } | null,
}


/**
 * Returns the timestamp where SRP tracking starts, or null if SRP tracking is
 * not enabled.
 */
export default jsonEndpoint((req, res, db, account, privs): Bluebird<Output> => {
  return Bluebird.resolve(handleEndpoint(db, account, privs));
});

async function handleEndpoint(
    db: Tnex,
    account: AccountSummary,
    privs: AccountPrivileges,
) {
  privs.requireRead('serverConfig');

  const config = await dao.config.get(db, 'srpJurisdiction');

  return {
    srpJurisdiction:
        config.srpJurisdiction && { start: config.srpJurisdiction.start }
  };
}
