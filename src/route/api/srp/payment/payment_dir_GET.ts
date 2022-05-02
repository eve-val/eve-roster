import moment from "moment";

import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { AccountSummary } from "../../../../infra/express/getAccountPrivs.js";
import { AccountPrivileges } from "../../../../infra/express/privileges.js";
import { Tnex, ResultOrder } from "../../../../db/tnex/index.js";
import { dao } from "../../../../db/dao.js";
import {
  boolQuery,
  intQuery,
  enumQuery,
} from "../../../../util/express/paramVerifier.js";
import { nil, SimpleNumMap } from "../../../../util/simpleTypes.js";
import { fetchEveNames } from "../../../../data-source/esi/names.js";
import { SrpReimbursementFilter } from "../../../../db/dao/SrpDao.js";

export interface Output {
  payments: PaymentJson[];
  names: SimpleNumMap<string>;
}

export interface PaymentJson {
  id: number;
  modified: number;
  modifiedStr: string;
  totalPayout: number;
  totalLosses: number;
  recipient: number;
  recipientCorp: number | null;
  payer: number | null;
  payerCorp: number | null;
}

export enum OrderBy {
  ID = "id",
  MODIFIED = "modified",
}

/**
 * Returns a list of recent payments. Query can be filtered in a number of ways.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(db, account, privs, {
    paid: boolQuery(req, "paid"),
    account: intQuery(req, "account"),
    limit: intQuery(req, "limit"),
    order:
      enumQuery<ResultOrder>(req, "order", ResultOrder) || ResultOrder.DESC,
    orderBy: enumQuery<OrderBy>(req, "orderBy", OrderBy) || OrderBy.ID,
    startingAfter: intQuery(req, "startingAfter"),
  });
});

const DEFAULT_ROWS_PER_QUERY = 30;
const MAX_ROWS_PER_QUERY = 100;

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
  filter: SrpReimbursementFilter
) {
  privs.requireRead("srp");

  filter.limit = Math.min(
    MAX_ROWS_PER_QUERY,
    filter.limit || DEFAULT_ROWS_PER_QUERY
  );

  const rows = await dao.srp.listReimbursements(db, filter);

  const ids = new Set<number | nil>();
  const payments: PaymentJson[] = rows.map((row) => {
    ids.add(row.srpr_recipientCharacter);
    ids.add(row.character_corporationId);
    ids.add(row.srpr_payingCharacter);
    ids.add(row.payingChar_corporationId);

    return {
      id: row.srpr_id,
      modified: row.srpr_modified,
      modifiedStr: moment.utc(row.srpr_modified).format("YYYY-MM-DD HH:mm"),
      totalPayout: row.combined_payout,
      totalLosses: row.combined_losses,
      recipient: row.srpr_recipientCharacter,
      recipientCorp: row.character_corporationId,
      payer: row.srpr_payingCharacter,
      payerCorp: row.payingChar_corporationId,
    };
  });

  const names = await fetchEveNames(ids);

  return {
    payments: payments,
    names: names,
  };
}
