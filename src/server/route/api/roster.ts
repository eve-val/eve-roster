import moment from "moment";

import { dao } from "../../db/dao.js";
import { Tnex } from "../../db/tnex/index.js";
import {
  BasicRosterCharacter,
  OwnedRosterCharacter,
} from "../../db/dao/RosterDao.js";
import { AccountPrivileges } from "../../infra/express/privileges.js";
import { jsonEndpoint } from "../../infra/express/protectedEndpoint.js";
import { isAnyEsiError } from "../../data-source/esi/error.js";
import * as alert from "../../../shared/rosterAlertLevels.js";
import { fetchEveNames } from "../../data-source/esi/names.js";
import { SimpleMap } from "../../../shared/util/simpleTypes.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger.js";
import {
  AccountJson,
  Alertable,
  CharacterJson,
  Roster_GET,
} from "../../../shared/route/api/roster_GET.js";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<Roster_GET> => {
    privs.requireRead("roster");

    return Promise.all([
      dao.roster.getCharactersOwnedByAssociatedAccounts(db),
      dao.roster.getUnownedCorpCharacters(db),
      getCorpNames(db),
    ]).then(([ownedChars, unownedChars, corpNames]) => {
      const accountList = [] as AccountJson[];

      pushAccounts(ownedChars, privs, corpNames, accountList);

      for (const unownedChar of unownedChars) {
        accountList.push(
          getJsonForUnownedCharacter(unownedChar, privs, corpNames),
        );
      }

      return {
        columns: getProvidedColumns(privs),
        rows: accountList,
      };
    });
  },
);

function getCorpNames(db: Tnex) {
  return Promise.resolve()
    .then(() => {
      return dao.roster.getRosterCharacterCorps(db);
    })
    .then((corpIds) => {
      return fetchEveNames(corpIds);
    })
    .catch((e) => {
      if (isAnyEsiError(e)) {
        // Move on with a null map and show a warning later
        // FIXME attach warning to response object once warnings are supported
        // in the roster client view
        logger.error("ESI error fetching corporation names", e);
        return null;
      } else {
        // Re-throw since it's something more serious
        throw e;
      }
    });
}

function pushAccounts(
  ownedRows: OwnedRosterCharacter[],
  privs: AccountPrivileges,
  corpNames: SimpleMap<string> | null,
  outList: AccountJson[],
) {
  interface AccountGroup {
    id: number;
    main: OwnedRosterCharacter | null;
    alts: OwnedRosterCharacter[];
  }

  const accountGroups = new Map<number, AccountGroup>();

  for (const row of ownedRows) {
    const accountId = row.account_id;
    let group = accountGroups.get(accountId);
    if (group == null) {
      group = {
        id: accountId,
        main: null,
        alts: [],
      };
      accountGroups.set(accountId, group);
    }
    if (row.character_id == row.account_mainCharacter) {
      group.main = row;
    } else {
      if (!row.ownership_opsec || privs.canRead("memberOpsecAlts")) {
        group.alts.push(row);
      }
    }
  }

  for (const group of accountGroups.values()) {
    if (group.main == null) {
      // TODO: Display an error without crashing.
      throw new Error(`Account ${group.id} has no main character.`);
    }

    outList.push(getJsonForAccount(group.main, group.alts, privs, corpNames));
  }
}

function getJsonForAccount(
  mainRow: OwnedRosterCharacter,
  altRows: OwnedRosterCharacter[],
  privs: AccountPrivileges,
  corpNames: SimpleMap<string> | null,
): AccountJson {
  const accountJson: AccountJson = {
    main: getJsonForCharacter(mainRow, "main", privs, corpNames),
    alts: [],
  };

  if (mainRow.mcorp_membership != "full") {
    if (mainRow.mcorp_membership == "affiliated") {
      addAlert(
        accountJson,
        alert.LEVEL_WARNING,
        "Main character is not in primary corporation.",
      );
    } else {
      addAlert(
        accountJson,
        alert.LEVEL_ERROR,
        "Main character is not in any affiliated corporation.",
      );
    }
  }

  if (altRows != null && privs.canRead("memberAlts")) {
    accountJson.alts = altRows.map((char) =>
      getJsonForCharacter(char, "alt", privs, corpNames),
    );
  }

  if (privs.canRead("memberHousing")) {
    accountJson.activeTimezone = mainRow.account_activeTimezone;
  }

  if (privs.canRead("memberTimezone")) {
    accountJson.homeCitadel = mainRow.citadel_name;
  }

  if (mainRow.trialCheck_group != null) {
    addAlert(accountJson, alert.LEVEL_INFO, "Trial member");
  }

  return accountJson;
}

function getJsonForUnownedCharacter(
  character: BasicRosterCharacter,
  privs: AccountPrivileges,
  corpNames: SimpleMap<string> | null,
): AccountJson {
  const json: AccountJson = {
    main: getJsonForCharacter(character, "unowned", privs, corpNames),
    alts: [],
  };

  addAlert(json, alert.LEVEL_WARNING, "Character is not claimed.");

  return json;
}

function getJsonForCharacter(
  row: BasicRosterCharacter,
  status: "main" | "alt" | "unowned",
  privs: AccountPrivileges,
  corpNames: SimpleMap<string> | null,
): CharacterJson {
  const obj = {
    id: row.character_id,
    name: row.character_name,
    corporationId: row.character_corporationId,
    corporationName:
      corpNames?.[row.character_corporationId] ?? "Name unavailable",
  } as CharacterJson;

  if (row.mcorp_membership == "full" || row.mcorp_membership == "affiliated") {
    if (row.character_titles == null || row.character_titles.length == 0) {
      if (status == "main") {
        addAlert(obj, alert.LEVEL_ERROR, "Main does not have roles.");
      } else if (status == "alt") {
        if (row.mcorp_membership == "full") {
          addAlert(obj, alert.LEVEL_WARNING, "Alt does not have roles.");
        }
      } else if (status == "unowned") {
        addAlert(obj, alert.LEVEL_ERROR, "Character does not have roles.");
      }
    }
    if (row.accessToken_needsUpdate) {
      addAlert(
        obj,
        alert.LEVEL_ERROR,
        `Character needs to be reauthenticated.`,
      );
    }
  }

  if (privs.canRead("characterActivityStats")) {
    let lastSeen;
    let lastSeenLabel;
    if (row.character_logonDate != null && row.character_logoffDate != null) {
      lastSeen =
        row.character_logonDate > row.character_logoffDate
          ? Date.now()
          : row.character_logoffDate;
      lastSeenLabel =
        row.character_logonDate > row.character_logoffDate
          ? "now"
          : moment(row.character_logoffDate).fromNow();
    } else {
      lastSeen = 0;
      lastSeenLabel = null;
    }

    obj.lastSeen = lastSeen;
    obj.lastSeenLabel = lastSeenLabel;
    obj.killsInLastMonth = row.cstats_killsInLastMonth;
    obj.killValueInLastMonth = row.cstats_killValueInLastMonth;
    obj.lossesInLastMonth = row.cstats_lossesInLastMonth;
    obj.lossValueInLastMonth = row.cstats_lossValueInLastMonth;
    obj.siggyScore = row.character_siggyScore;
  }

  return obj;
}

function getProvidedColumns(privs: AccountPrivileges) {
  const providedColumns = [
    "id",
    "name",
    "corporationId",
    "corporationName",
    "alertMessage",
    "alertLevel",
  ];

  if (privs.canRead("memberAlts")) {
    providedColumns.push("alts");
  }
  if (privs.canRead("memberHousing")) {
    providedColumns.push("activeTimezone");
  }
  if (privs.canRead("memberTimezone")) {
    providedColumns.push("homeCitadel");
  }

  if (privs.canRead("characterActivityStats")) {
    providedColumns.push(
      "lastSeen",
      "killsInLastMonth",
      "killValueInLastMonth",
      "lossesInLastMonth",
      "lossValueInLastMonth",
      "siggyScore",
    );
  }
  return providedColumns;
}

function addAlert(target: Alertable, level: number, message: string) {
  if (target.alertMessage) {
    // Append message and possibly increase level
    target.alertMessage = target.alertMessage + "\n" + message;
    target.alertLevel = Math.max(target.alertLevel ?? 0, level);
  } else {
    // No previous message so set as-is
    target.alertMessage = message;
    target.alertLevel = level;
  }
}
