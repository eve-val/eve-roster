import { dao } from "../../db/dao.js";
import { NotFoundError } from "../../error/NotFoundError.js";
import { jsonEndpoint } from "../../infra/express/protectedEndpoint.js";
import { loadSummarizedQueue } from "../../domain/skills/skillQueueSummarizer.js";
import { SkillQueueSummary } from "../../../shared/types/SkillQueueSummary.js";
import { parallelize } from "../../util/asyncUtil.js";
import { canDesignateMain } from "../../domain/account/canDesignateMain.js";
import { EVE_SSO_LOGIN_PARAMS } from "../../domain/sso/loginParams.js";
import { getEnv } from "../../infra/init/Env.js";

export interface Output {
  accountId: number;
  characters: CharacterJson[];
  transfers: { character: number; name: string }[];
  loginParams: string;
  mainCharacter: number;
  access: {
    designateMain: number;
    isMember: boolean;
  };
}

export interface CharacterJson {
  id: number;
  name: string;
  opsec: boolean;
  corpStatus: string;
  skillQueue: SkillQueueSummary;
  corpId: number;
  needsReauth: boolean;
}

export default jsonEndpoint<Output>((req, res, db, account, privs) => {
  let mainCharacter: number;

  let characters = [] as CharacterJson[];
  const access = {
    designateMain: 0,
    isMember: privs.isMember(),
  };

  return Promise.resolve()
    .then(() => {
      return dao.account.getDetails(db, account.id);
    })
    .then((row) => {
      if (row == null) {
        throw new NotFoundError();
      }

      mainCharacter = row.account_mainCharacter;
      access.designateMain = canDesignateMain(row.account_created) ? 2 : 0;

      return dao.character.getCharactersOwnedByAccount(db, account.id);
    })
    .then((rows) => {
      return parallelize(rows, (row) => {
        return loadSummarizedQueue(db, row.character_id, "cached").then(
          (queue) => {
            return {
              id: row.character_id,
              name: row.character_name,
              opsec: row.ownership_opsec && privs.isMember(),
              corpStatus: getCorpStatus(row.mcorp_membership),
              skillQueue: queue,
              corpId: row.character_corporationId,
              needsReauth: row.accessToken_needsUpdate !== false,
            };
          }
        );
      });
    })
    .then((_characters) => {
      characters = _characters;

      return dao.ownership.getAccountPendingOwnership(db, account.id);
    })
    .then((transfers) => {
      const strippedTransfers = transfers.map((transfer) => ({
        character: transfer.pendingOwnership_character,
        name: transfer.character_name,
      }));

      return {
        accountId: account.id,
        characters: characters,
        transfers: strippedTransfers,
        loginParams: EVE_SSO_LOGIN_PARAMS.get(getEnv()),
        mainCharacter: mainCharacter,
        access: access,
      };
    });
});

function getCorpStatus(membership: string | null) {
  // TODO: Push this schema all the way down to the client and remove the need
  // for this transform
  switch (membership) {
    case "full":
      return "primary";
    case "affiliated":
      return "alt";
    default:
      return "external";
  }
}
