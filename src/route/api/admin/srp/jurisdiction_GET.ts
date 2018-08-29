import { jsonEndpoint } from '../../../../express/protectedEndpoint';
import { Tnex } from '../../../../tnex';
import { AccountSummary } from '../../../../express/getAccountPrivs';
import { AccountPrivileges } from '../../../../express/privileges';
import { dao } from '../../../../db/dao';


export interface Output {
  srpJurisdiction: { start: number } | null,
}


/**
 * Returns the timestamp where SRP tracking starts, or null if SRP tracking is
 * not enabled.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(db, account, privs);
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
