import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { Tnex } from "../../../../db/tnex/Tnex.js";
import { AccountPrivileges } from "../../../../infra/express/privileges.js";
import { dao } from "../../../../db/dao.js";
import { SrpVerdictStatus } from "../../../../db/dao/enums.js";
import { SimpleNumMap, nil } from "../../../../../shared/util/simpleTypes.js";
import {
  boolQuery,
  intQuery,
  enumQuery,
} from "../../../../util/express/paramVerifier.js";
import { fetchEveNames } from "../../../../data-source/esi/names.js";
import { srpLossToJson } from "../../../../domain/srp/srpLossToJson.js";
import { SrpLossFilter } from "../../../../db/dao/SrpDao.js";
import { ResultOrder } from "../../../../db/tnex/index.js";
import { SrpLossJson } from "../../../../domain/srp/SrpLossJson.js";
import { triageLosses } from "../../../../domain/srp/triage/triageLosses.js";
import { triagedLossesToSuggestionJson } from "../../../../domain/srp/triage/triagedLossesToSuggestionJson.js";

export interface Output {
  srps: SrpLossJson[];
  names: SimpleNumMap<string>;
}

/**
 * Returns a list of losses and their associated SRP verdict and payment status.
 * Supports a wide variety of filters.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(
    db,
    privs,
    {
      status: boolQuery(req, "pending") ? SrpVerdictStatus.PENDING : undefined,
      limit: intQuery(req, "limit"),
      order: enumQuery<ResultOrder>(req, "order", ResultOrder),
      fromKillmail: intQuery(req, "fromKillmail"),
      account: intQuery(req, "account"),
      character: intQuery(req, "character"),
    },
    boolQuery(req, "includeTriage") || false,
  );
});

const DEFAULT_ROWS_PER_QUERY = 30;
const MAX_ROWS_PER_QUERY = 100;

async function handleEndpoint(
  db: Tnex,
  privs: AccountPrivileges,
  filter: SrpLossFilter,
  includeTriage: boolean,
) {
  privs.requireRead("srp");

  filter.limit = Math.min(
    MAX_ROWS_PER_QUERY,
    filter.limit || DEFAULT_ROWS_PER_QUERY,
  );

  const unresolvedIds = new Set<number | nil>();

  const rows = await dao.srp.listSrps(db, filter);
  const srps = rows.map((row) => srpLossToJson(row, unresolvedIds));

  if (includeTriage) {
    const triaged = await triageLosses(db, rows);
    const suggestionsJson = await triagedLossesToSuggestionJson(triaged);
    for (const srp of srps) {
      srp.triage = suggestionsJson.get(srp.killmail) || null;
    }
  }

  const resolvedIds = await fetchEveNames(unresolvedIds);

  return {
    srps: srps,
    names: resolvedIds,
  };
}
