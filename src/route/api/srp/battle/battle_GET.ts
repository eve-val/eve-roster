import { jsonEndpoint } from "../../../../infra/express/protectedEndpoint.js";
import { dao } from "../../../../db/dao.js";
import { boolQuery, idParam } from "../../../../util/express/paramVerifier.js";
import {
  BattleOutput,
  battlesToJson,
} from "../../../../domain/battle/battlesToJson.js";

export default jsonEndpoint(
  async (req, res, db, _account, _privs): Promise<BattleOutput> => {
    const id = idParam(req, "id");
    const includeSrps = boolQuery(req, "includeSrp") || false;

    const battles = await dao.battle.listBattles(db, { id: id });

    return battlesToJson(db, battles, includeSrps);
  }
);
