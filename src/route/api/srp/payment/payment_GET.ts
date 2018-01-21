import Bluebird = require('bluebird');
import moment = require('moment');

import { jsonEndpoint } from '../../../../route-helper/protectedEndpoint';
import { Tnex } from '../../../../tnex';
import { AccountPrivileges } from '../../../../route-helper/privileges';
import { idParam } from '../../../../route-helper/paramVerifier';
import { dao } from '../../../../dao';
import { NotFoundError } from '../../../../error/NotFoundError';
import swagger from '../../../../swagger';
import { SimpleNumMap } from '../../../../util/simpleTypes';
import { srpLossToJson } from '../../../../srp/srpLossToJson';
import { fetchEveNames } from '../../../../eve/names';
import { SrpLossJson } from '../../../../srp/SrpLossJson';

export interface Output {
  payment: {
    recipient: number,
    modified: number,
    modifiedLabel: string,
    paid: boolean,
    payer: number | null,
  },
  losses: SrpLossJson[],
  names: SimpleNumMap<string>,
}


/**
 * Return information about a SRP reimbursement as well as all of its associated
 * approved losses.
 */
export default jsonEndpoint((req, res, db, account, privs): Bluebird<Output> => {
  const paymentId = idParam(req, 'id');

  return Bluebird.resolve(handleEndpoint(db, privs, paymentId));
});

async function handleEndpoint(
    db: Tnex, privs: AccountPrivileges, paymentId: number) {
  privs.requireRead('srp');

  const reimbRow = await dao.srp.getReimbursement(db, paymentId);

  if (reimbRow == null) {
    throw new NotFoundError();
  }

  const lossRows = await dao.srp.listSrps(db, { reimbursement: paymentId });

  const ids = new Set<number | null>();
  ids.add(reimbRow.srpr_recipientCharacter);
  ids.add(reimbRow.srpr_payingCharacter);

  const losses = lossRows.map(row => srpLossToJson(row, ids));
  const names = await fetchEveNames(ids);

  return {
    payment: {
      recipient: reimbRow.srpr_recipientCharacter,
      modified: reimbRow.srpr_modified,
      modifiedLabel:
          moment.utc(reimbRow.srpr_modified).format('YYYY-MM-DD HH:mm'),
      paid: reimbRow.srpr_paid,
      payer: reimbRow.srpr_payingCharacter,
    },
    losses: losses,
    names: names,
  }
}
