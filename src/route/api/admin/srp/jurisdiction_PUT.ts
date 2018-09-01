import { jsonEndpoint } from '../../../../infra/express/protectedEndpoint';
import { verify, number, nullable, } from '../../../../util/express/schemaVerifier';

import { Tnex } from '../../../../db/tnex';
import { AccountPrivileges } from '../../../../infra/express/privileges';
import { AccountSummary } from '../../../../infra/express/getAccountPrivs';
import { dao } from '../../../../db/dao';


export class Input {
  start = nullable(number());
}
const inputSchema = new Input();


/**
 * Sets the timestamp where SRP tracking starts. A null value disables SRP
 * syncing.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<{}> => {
  return handleEndpoint(db, account, privs, verify(req.body, inputSchema));
});

async function handleEndpoint(
    db: Tnex, account: AccountSummary, privs: AccountPrivileges, input: Input) {
  privs.requireWrite('serverConfig');

  await dao.config.set(db, {
    srpJurisdiction: input.start == null
        ? null : { start: input.start, end: undefined }
  });

  if (input.start != null) {
    await dao.srp.adjustJurisdictionStatuses(db, input.start);
  }

  return {};
}
