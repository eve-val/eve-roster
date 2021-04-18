import { jsonEndpoint } from "../../../infra/express/protectedEndpoint";
import { dao } from "../../../db/dao";
import * as sde from "../../../eve/sde";
import { BadRequestError } from "../../../error/BadRequestError";

import { SkillRequirement } from "../../../db/dao/StatisticsDao";
import { stringQuery } from "../../../util/express/paramVerifier";

export interface Output {
  query: string[];
  stats: {
    matchingAccounts: number;
    totalAccounts: number;
    percentage: string;
  };
  accounts: { main: string; killsOnMain: number }[];
}

export default jsonEndpoint(
  (req, res, db, account, privs): Promise<Output> => {
    privs.requireRead("characterSkills", false);

    // Format: <skillId>:<minLevel>,...
    // eg. "3333:5,3335:5,3337:5"
    const skillRequirements = parseQuery(stringQuery(req, "q"));

    let numAccounts: number;

    return Promise.resolve()
      .then(() => {
        return dao.roster.getMemberAccounts(db);
      })
      .then((rows) => {
        numAccounts = rows.length;

        return dao.statistics.getTrainedPercentage(db, skillRequirements);
      })
      .then((rows) => {
        return {
          query: skillRequirements.map(
            (sr) => `${sde.getSkillName(sr.skill)} ${sr.minLevel}`
          ),
          stats: {
            matchingAccounts: rows.length,
            totalAccounts: numAccounts,
            percentage: Math.round((rows.length / numAccounts) * 100) + "%",
          },
          accounts: rows.map((row: any) => {
            return {
              main: row.name,
              killsOnMain: row.kills,
            };
          }),
        };
      });
  }
);

const SKILL_PATTERN = /^(\d+):(\d+),?/;

function parseQuery(query: string | undefined) {
  if (query == undefined) {
    throw new BadRequestError(`Mandatory query "q" missing.`);
  }

  const reqs = [] as SkillRequirement[];

  let str = query;
  while (str.length > 0) {
    const match = SKILL_PATTERN.exec(str);
    if (!match) {
      throw new BadRequestError(`Bad skills query: "${str}" in ${query}.`);
    }
    reqs.push({
      skill: parseInt(match[1]),
      minLevel: parseInt(match[2]),
    });
    str = str.substr(match[0].length);
  }

  return reqs;
}
