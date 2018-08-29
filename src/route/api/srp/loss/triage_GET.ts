import { jsonEndpoint } from '../../../../express/protectedEndpoint';
import { AccountSummary } from '../../../../express/getAccountPrivs';
import { AccountPrivileges } from '../../../../express/privileges';
import { Tnex } from '../../../../tnex';
import { dao } from '../../../../dao';
import { NotFoundError } from '../../../../error/NotFoundError';
import { idParam } from '../../../../route-helper/paramVerifier';
import { SrpTriageJson } from '../../../../domain/srp/SrpLossJson';
import { triagedLossesToSuggestionJson } from '../../../../domain/srp/triage/triagedLossesToSuggestionJson';
import { triageLosses } from '../../../../domain/srp/triage/triageLosses';


export interface Output {
  triage: SrpTriageJson | null,
}


/**
 * Returns the suggested triage verdict(s) for a particular loss.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {

  return handleEndpoint(db, account, privs, idParam(req, 'id'));
});

async function handleEndpoint(
    db: Tnex,
    account: AccountSummary,
    privs: AccountPrivileges,
    id: number,
) {
  privs.requireWrite('srp');

  const rows = await dao.srp.listSrps(db, { killmail: id, });

  if (rows.length == 0) {
    throw new NotFoundError();
  }

  const jsonMap =
      await triagedLossesToSuggestionJson(
          await triageLosses(db, rows));

  return {
    triage: jsonMap.get(id) || null,
  }
}
