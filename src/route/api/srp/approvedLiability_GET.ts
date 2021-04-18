import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { Tnex } from "../../../db/tnex";
import { AccountSummary } from "../../../infra/express/getAccountPrivs";
import { AccountPrivileges } from "../../../infra/express/privileges";
import { dao } from "../../../db/dao";

export interface Output {
  approvedLiability: number;
}

/**
 * Returns the sum of all approved but unpaid SRPs.
 */

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<Output> => {
    return handleEndpoint(db, account, privs);
  }
);

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges
) {
  const row = await dao.srp.getApprovedLiability(db);

  return {
    approvedLiability: (row && row.liability) || 0,
  };
}
