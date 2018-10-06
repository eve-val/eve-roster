import { jsonEndpoint } from '../../../../infra/express/protectedEndpoint';
import { dao } from '../../../../db/dao';
import { boolQuery, idParam } from '../../../../util/express/paramVerifier';
import { BattleOutput, battlesToJson } from '../../../../domain/battle/battlesToJson';


export default jsonEndpoint(
    async (req, res, db, account, privs): Promise<BattleOutput> => {

  const id = idParam(req, 'id');
  const includeSrps = boolQuery(req, 'includeSrp') || false;

  const battles = await dao.battle.listBattles(db, { id: id });

  return battlesToJson(db, battles, includeSrps);
});
