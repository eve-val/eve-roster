/**
 * Return a Promise that resolves to the account row and privileges object for
 * the given id, or throws an exception if there is no such account or if they
 * are not logged in. The resolved data is an object `{account: accountRow,
 * privs: privileges}`.
 *
 * @param accountId
 * @returns {Promise}
 */
import { Tnex } from "../../db/tnex";
import { dao } from "../../db/dao";
import { getPrivileges } from "./privileges";

import { NoSuchAccountError } from "../../error/NoSuchAccountError";
import { NotLoggedInError } from "../../error/NotLoggedInError";

export interface AccountSummary {
  id: number;
  mainCharacter: number;
  created: number;
}

export function getAccountPrivs(db: Tnex, accountId: number | undefined) {
  if (accountId == undefined) {
    throw new NotLoggedInError();
  }

  return Promise.resolve()
    .then(() => {
      return dao.account.getDetails(db, accountId);
    })
    .then((row) => {
      if (row == null) {
        throw new NoSuchAccountError(accountId);
      }
      return getPrivileges(db, row.account_id).then((privs) => {
        const accountSummary: AccountSummary = {
          id: row.account_id,
          mainCharacter: row.account_mainCharacter,
          created: row.account_created,
        };

        return { account: accountSummary, privs: privs };
      });
    });
}
