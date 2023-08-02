import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { AccountSummary } from "../../../../infra/express/getAccountPrivs.js";
import { AccountPrivileges } from "../../../../infra/express/privileges.js";
import { Tnex } from "../../../../db/tnex/index.js";
import { dao } from "../../../../db/dao.js";
import { NotFoundError } from "../../../../error/NotFoundError.js";
import { idParam } from "../../../../util/express/paramVerifier.js";
import { triagedLossesToSuggestionJson } from "../../../../domain/srp/triage/triagedLossesToSuggestionJson.js";
import { triageLosses } from "../../../../domain/srp/triage/triageLosses.js";
import { SrpTriageJson } from "../../../../../shared/types/srp/SrpLossJson.js";

export interface Output {
  triage: SrpTriageJson | null;
}

/**
 * Returns the suggested triage verdict(s) for a particular loss.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(db, account, privs, idParam(req, "id"));
});

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
  id: number,
) {
  privs.requireWrite("srp");

  const rows = await dao.srp.listSrps(db, { killmail: id });

  if (rows.length == 0) {
    throw new NotFoundError();
  }

  const jsonMap = await triagedLossesToSuggestionJson(
    await triageLosses(db, rows),
  );

  return {
    triage: jsonMap.get(id) ?? null,
  };
}
