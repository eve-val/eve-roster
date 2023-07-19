import { Tnex, DEFAULT_NUM } from "../../db/tnex/index.js";
import { Dao } from "../dao.js";
import { account, accountLog, character } from "../tables.js";

export type LoggableEvent =
  | "CREATE_ACCOUNT"
  | "OWN_CHARACTER"
  | "DESIGNATE_MAIN"
  | "MERGE_ACCOUNTS"
  | "MODIFY_GROUPS"
  | "GAIN_MEMBERSHIP"
  | "LOSE_MEMBERSHIP"
  | "TRANSFER_CHARACTER"
  | "MODIFY_SERVER_CONFIG";

export default class LogDao {
  constructor(private _parent: Dao) {}

  logEvent(
    db: Tnex,
    accountId: number,
    event: LoggableEvent,
    relatedCharacter: number | null = null,
    data?: object,
  ): Promise<void> {
    return db
      .insert(accountLog, {
        accountLog_id: DEFAULT_NUM,
        accountLog_timestamp: Date.now(),
        accountLog_account: accountId,
        accountLog_originalAccount: accountId,
        accountLog_event: event,
        accountLog_relatedCharacter: relatedCharacter,
        accountLog_data: data != undefined ? JSON.stringify(data) : null,
      })
      .then(() => {});
  }

  getAccountLogsRecent(db: Tnex) {
    return db
      .select(accountLog)
      .leftJoin(account, "account_id", "=", "accountLog_account")
      .leftJoin(
        db
          .alias(character, "mainChar")
          .using("character_id", "mainChar_id")
          .using("character_name", "mainChar_name"),
        "mainChar_id",
        "=",
        "account_mainCharacter",
      )
      .leftJoin(
        db
          .alias(character, "relatedChar")
          .using("character_id", "relatedChar_id")
          .using("character_name", "relatedChar_name"),
        "relatedChar_id",
        "=",
        "accountLog_relatedCharacter",
      )
      .orderBy("accountLog_timestamp", "desc")
      .limit(200)
      .columns(
        "accountLog_id",
        "accountLog_timestamp",
        "accountLog_account",
        "accountLog_originalAccount",
        "mainChar_name",
        "accountLog_event",
        "accountLog_relatedCharacter",
        "relatedChar_name",
        "accountLog_data",
      )
      .run();
  }
}
