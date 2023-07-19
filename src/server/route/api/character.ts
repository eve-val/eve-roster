import _ from "underscore";

import { Tnex } from "../../db/tnex/index.js";
import { dao } from "../../db/dao.js";
import { jsonEndpoint } from "../../infra/express/protectedEndpoint.js";
import { AccountPrivileges } from "../../infra/express/privileges.js";
import { idParam } from "../../util/express/paramVerifier.js";
import { NotFoundError } from "../../error/NotFoundError.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger.js";
import { TIMEZONE_LABELS } from "../../domain/roster/timezoneLabels.js";
import { Character_GET } from "../../../shared/route/api/character_GET.js";
import { EsiNameFetcher } from "../../data-source/esi/EsiNameFetcher.js";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export default jsonEndpoint(
  async (req, res, db, account, privs): Promise<Character_GET> => {
    const characterId = idParam(req, "id");

    const row = await dao.character.getDetailedCharacterStats(db, characterId);
    if (row == null) {
      throw new NotFoundError();
    }

    const accountId = row.account_id;
    const isOwned = account.id == row.account_id;

    const payload: Character_GET = {
      character: {
        name: row.character_name,
        corporationId: row.character_corporationId,
        titles: row.character_titles || [],
        totalSp: row.sp_total || 0,
      },
      account: {
        id: row.account_id,
        groups: [],
        main: undefined,
        alts: undefined,
        citadelName: undefined,
        activeTimezone: undefined,
      },
      access: privs.dumpForFrontend(
        [
          "memberTimezone",
          "memberHousing",
          "characterSkills",
          "characterSkillQueue",
        ],
        isOwned,
      ),
      names: await new EsiNameFetcher([row.character_corporationId]).fetch(),
    };

    if (privs.canRead("memberTimezone", isOwned)) {
      payload.account.activeTimezone = row.account_activeTimezone || undefined;
    }

    if (privs.canRead("memberHousing", isOwned)) {
      payload.account.citadelName = row.citadel_name || undefined;
    }

    if (privs.canRead("memberAlts", isOwned) && row.account_id != null) {
      if (row.account_mainCharacter == characterId) {
        injectAlts(db, row.account_id, characterId, privs, payload);
      } else {
        injectMain(db, row.account_id, payload);
      }
    }

    if (privs.canWrite("memberTimezone", isOwned)) {
      payload.timezones = TIMEZONE_LABELS;
    }
    if (privs.canWrite("memberHousing", isOwned)) {
      const citadelRows = await dao.citadel.getAll(db, ["citadel_name"]);
      payload.citadels = _.pluck(citadelRows, "citadel_name");
    }

    if (accountId != null && privs.canRead("memberGroups")) {
      payload.account.groups = await dao.group.getAccountGroups(db, accountId);
    }

    return payload;
  },
);

function injectAlts(
  db: Tnex,
  accountId: number,
  thisCharacterId: number,
  privs: AccountPrivileges,
  payload: Character_GET,
) {
  return dao.account.getAlts(db, accountId).then(function (rows) {
    const alts = [];
    for (const row of rows) {
      if (row.ownership_opsec && !privs.canRead("memberOpsecAlts")) {
        continue;
      }
      alts.push({
        id: row.character_id,
        name: row.character_name,
      });
    }
    alts.sort(function (a, b) {
      return a.name.localeCompare(b.name);
    });

    if (alts.length > 0) {
      payload.account.alts = alts;
    }
  });
}

function injectMain(db: Tnex, accountId: number, payload: Character_GET) {
  return dao.account.getMain(db, accountId).then((row) => {
    if (row == null) {
      logger.error(`(in character.ts) Account ${accountId} has a null main.`);
      return;
    }

    payload.account.main = {
      id: row.character_id,
      name: row.character_name,
    };
  });
}
