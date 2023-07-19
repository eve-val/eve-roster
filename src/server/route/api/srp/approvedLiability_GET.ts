import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { Tnex } from "../../../db/tnex/index.js";
import { AccountSummary } from "../../../infra/express/getAccountPrivs.js";
import { AccountPrivileges } from "../../../infra/express/privileges.js";
import { dao } from "../../../db/dao.js";

export interface Output {
  approvedLiability: number;
}

/**
 * Returns the sum of all approved but unpaid SRPs.
 */

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(db, account, privs);
});

async function handleEndpoint(
  db: Tnex,
  _account: AccountSummary,
  _privs: AccountPrivileges,
) {
  const row = await dao.srp.getApprovedLiability(db);

  return {
    approvedLiability: (row && row.liability) || 0,
  };
}
