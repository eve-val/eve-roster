import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { Tnex } from "../../../../db/tnex/index.js";
import { AccountSummary } from "../../../../infra/express/getAccountPrivs.js";
import { AccountPrivileges } from "../../../../infra/express/privileges.js";
import { dao } from "../../../../db/dao.js";

export interface Output {
  srpJurisdiction: { start: number } | null;
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
  privs: AccountPrivileges
) {
  privs.requireRead("serverConfig");

  const config = await dao.config.get(db, "srpJurisdiction");

  return {
    srpJurisdiction: config.srpJurisdiction && {
      start: config.srpJurisdiction.start,
    },
  };
}
