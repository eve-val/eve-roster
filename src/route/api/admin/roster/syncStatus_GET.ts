import _ from "underscore";

import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint";
import { Tnex } from "../../../../db/tnex/index";
import { dao } from "../../../../db/dao";
import { AccountSummary } from "../../../../infra/express/getAccountPrivs";
import { AccountPrivileges } from "../../../../infra/express/privileges";
import { SimpleNumMap } from "../../../../util/simpleTypes";
import { fetchEveNames } from "../../../../data-source/esi/names";
import { hasRosterScopes } from "../../../../domain/roster/hasRosterScopes";

export interface Output {
  corporations: CorpSection[];
  names: SimpleNumMap<string>;
}

export interface CorpSection {
  id: number;
  type: string;
  directors: {
    id: number;
    name: string;
    canUseToken: boolean;
    tokenStatusLabel: string;
  }[];
}

/**
 * For each member corporation, returns the names of known directors and whether
 * we have memberlist-capable access tokens for those characters.
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  return handleEndpoint(db, account, privs);
});

async function handleEndpoint(
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges
) {
  privs.requireRead("serverConfig");

  const memberRows = await dao.config.getMemberCorporations(db);
  const directorRows = await dao.roster.getMemberCorpDirectors(db);
  const directorGroups = _.groupBy(directorRows, "character_corporationId");

  const corps: CorpSection[] = [];
  const unresolvedNames: number[] = [];

  for (const memberRow of memberRows) {
    const corpSection: CorpSection = {
      id: memberRow.mcorp_corporationId,
      type: memberRow.mcorp_membership,
      directors: [],
    };

    const directors = directorGroups[memberRow.mcorp_corporationId];
    if (directors != undefined) {
      corpSection.directors = directors.map((row) => {
        const label =
          row.accessToken_scopes == null
            ? "No token"
            : !hasRosterScopes(row.accessToken_scopes)
            ? "Missing scopes"
            : row.accessToken_needsUpdate
            ? "Token expired"
            : "Have token";

        return {
          id: row.character_id,
          name: row.character_name,
          canUseToken: label == "Have token",
          tokenStatusLabel: label,
        };
      });
    }

    corps.push(corpSection);
    unresolvedNames.push(memberRow.mcorp_corporationId);
  }

  const names = await fetchEveNames(unresolvedNames);

  return {
    corporations: corps,
    names: names,
  };
}
