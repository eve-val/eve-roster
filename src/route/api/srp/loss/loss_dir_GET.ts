import Bluebird = require('bluebird');
import moment = require('moment');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { Tnex } from '../../../../tnex/Tnex';
import { AccountPrivileges } from '../../../../route-helper/privileges';
import { dao } from '../../../../dao';
import { SrpVerdictStatus } from '../../../../dao/enums';
import { SimpleNumMap, nil } from '../../../../util/simpleTypes';
import { boolQuery, intQuery, enumQuery } from '../../../../route-helper/paramVerifier';
import { findWhere } from '../../../../util/underscore';
import { fetchEveNames } from '../../../../eve/names';
import { srpLossToJson } from '../../../../srp/srpLossToJson';
import { SrpLossFilter, SrpLossRow } from '../../../../dao/SrpDao';
import { ResultOrder } from '../../../../tnex';
import { SrpLossJson, SrpTriageJson } from '../../../../srp/SrpLossJson';


export interface Output {
  srps: SrpLossJson[],
  names: SimpleNumMap<string>,
}


/**
 * Returns a list of losses and their associated SRP verdict and payment status.
 * Supports a wide variety of filters.
 */
export default jsonEndpoint((req, res, db, account, privs): Bluebird<Output> => {

  return Bluebird.resolve(
      handleEndpoint(
          db,
          privs,
          {
            status: boolQuery(req, 'pending')
                ? SrpVerdictStatus.PENDING : undefined,
            limit: intQuery(req, 'limit'),
            order: enumQuery<ResultOrder>(req, 'order', ResultOrder),
            fromKillmail: intQuery(req, 'fromKillmail'),
            account: intQuery(req, 'account'),
            character: intQuery(req, 'character'),
          },
          boolQuery(req, 'includeTriage') || false,
      )
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
  privs.requireRead('srp');

  filter.limit =
      Math.min(MAX_ROWS_PER_QUERY, filter.limit || DEFAULT_ROWS_PER_QUERY);

  const unresolvedIds = new Set<number | nil>();

  const rows = await dao.srp.listSrps(db, filter);
  let srps = rows.map(row => srpLossToJson(row, unresolvedIds));

  if (includeTriage) {
    // NEXT PR: Calculate loss triage
    for (let srp of srps) {
      // NEXT PR: Set loss triage here
    }
  }

  const resolvedIds = await fetchEveNames(unresolvedIds);

  return {
    srps: srps,
    names: resolvedIds,
  };
}
