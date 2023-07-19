import _ from "underscore";
import Bluebird from "bluebird";

import { dao } from "../../db/dao.js";
import { Tnex } from "../../db/tnex/index.js";
import { ADMIN_GROUP, MEMBER_GROUP } from "./specialGroups.js";
import { serialize } from "../../util/asyncUtil.js";
import { account } from "../../db/tables.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger.js";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export function updateGroupsOnAllAccounts(db: Tnex) {
  return db
    .select(account)
    .columns("account_id")
    .run()
    .then((rows) => {
      return serialize(rows, (row) => {
        return updateGroupsForAccount(db, row.account_id);
      });
    });
}

export function updateGroupsForAccount(db: Tnex, accountId: number) {
  return Promise.resolve()
    .then(() => {
      return computeGroups(db, accountId);
    })
    .then(({ groups, ownsAffiliatedChar }) => {
      if (!groups.includes(MEMBER_GROUP) && !groups.includes(ADMIN_GROUP)) {
        logger.verbose("Main char is not a member, stripping groups...");
        groups = [];
      }

      logger.debug(`updateAccount ${accountId}, groups= ${groups.join(", ")}`);
      if (!groups.includes(MEMBER_GROUP) && ownsAffiliatedChar) {
        // TODO: Flag the account somehow
      }
      return groups;
    })
    .then((groups) => {
      return dao.group.setAccountGroups(db, accountId, groups);
    });
}

function computeGroups(db: Tnex, accountId: number) {
  return Promise.all([
    dao.group.getExplicitGroups(db, accountId),
    getGroupsDerivedFromCharacters(db, accountId),
  ]).then(([accountGroups, [characterGroups, ownsAffiliatedChar]]) => {
    return {
      groups: _.uniq(accountGroups.concat(characterGroups)),
      ownsAffiliatedChar,
    };
  });
}

function getGroupsDerivedFromCharacters(db: Tnex, accountId: number) {
  return dao.character
    .getCharactersOwnedByAccount(db, accountId)
    .then((rows) => {
      const groups: string[] = [];
      return Bluebird.reduce(
        rows,
        (ownsAffiliatedChar, row) => {
          return Promise.resolve()
            .then(() => {
              return dao.group.getTitleDerivedGroups(
                db,
                row.character_corporationId,
                row.character_titles || [],
              );
            })
            .then((groupsFromTitles) => {
              groups.push(...groupsFromTitles);

              if (
                row.character_id == row.account_mainCharacter &&
                row.mcorp_membership == "full"
              ) {
                groups.push(MEMBER_GROUP);
              }
              if (
                row.mcorp_membership == "full" ||
                row.mcorp_membership == "affiliated"
              ) {
                ownsAffiliatedChar = true;
              }

              return ownsAffiliatedChar;
            });
        },
        false,
      ).then((ownsAffiliatedChar) => {
        return [groups, ownsAffiliatedChar] as [string[], boolean];
      });
    });
}
