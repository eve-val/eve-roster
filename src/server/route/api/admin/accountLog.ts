import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../db/dao.js";

export interface Output {
  rows: AccountLog[];
}

export interface AccountLog {
  id: number;
  timestamp: number;
  accountId: number;
  originalAccount: number;
  mainCharacter: string | null;
  event: string;
  relatedCharacter: number | null;
  relatedCharacterName: string | null;
  data: string | null;
}

export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  privs.requireRead("accountLogs", false);

  return Promise.resolve()
    .then(() => {
      return dao.log.getAccountLogsRecent(db);
    })
    .then((rows) => {
      return {
        rows: rows.map((row) => ({
          id: row.accountLog_id,
          timestamp: row.accountLog_timestamp,
          accountId: row.accountLog_account,
          originalAccount: row.accountLog_originalAccount,
          mainCharacter: row.mainChar_name,
          event: row.accountLog_event,
          relatedCharacter: row.accountLog_relatedCharacter,
          relatedCharacterName: row.relatedChar_name,
          data: row.accountLog_data,
        })),
      };
    });
});
