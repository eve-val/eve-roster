import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../db/dao.js";

import { parallelize } from "../../../util/asyncUtil.js";
import { loadSummarizedQueue } from "../../../domain/skills/skillQueueSummarizer.js";

import { SkillQueueSummary } from "../../../../shared/types/SkillQueueSummary.js";

export type Payload = {
  id: number;
  skillQueue: SkillQueueSummary;
}[];

export default jsonEndpoint(
  function (req, res, db, account, _privs): Promise<Payload> {
    return Promise.resolve()
      .then(() => {
        return dao.character.getCharacterIdsOwnedByAccount(db, account.id);
      })
      .then((ids) => {
        return parallelize(ids, (id) => {
          return loadSummarizedQueue(db, id, "fresh").then((summary) => {
            return {
              id: id,
              skillQueue: summary,
            };
          });
        });
      });
  },
);
