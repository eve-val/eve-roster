import { jsonEndpoint } from '../../../route-helper/protectedEndpoint';
import { Tnex } from '../../../tnex';
import { AccountPrivileges } from '../../../route-helper/privileges';
import { idParam } from '../../../route-helper/paramVerifier';
import { dao } from '../../../dao';
import { NotFoundError } from '../../../error/NotFoundError';
import { ZKillmail } from '../../../data-source/zkillboard/ZKillmail';
import { SimpleNumMap, nil } from '../../../util/simpleTypes';
import { fetchEveNames } from '../../../eve/names';


export interface Output {
  killmail: ZKillmail,
  names: SimpleNumMap<string>,
}


/**
 * Returns the data blob for a killmail as well as the names of any associated
 * entities (participants, items, etc.).
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  const killmailId = idParam(req, 'id');

  return handleEndpoint(db, privs, killmailId);
});

async function handleEndpoint(
    db: Tnex, privs: AccountPrivileges, killmailId: number) {

  const row = await dao.killmail.getKillmail(db, killmailId);
  if (row == null) {
    throw new NotFoundError();
  }

  const names = await buildNameMap(row.km_data);

  return {
    killmail: row.km_data,
    names: names,
  };
}

async function buildNameMap(mail: ZKillmail) {
  const unnamedIds = new Set<number | nil>();
  unnamedIds.add(mail.solar_system_id);
  unnamedIds.add(mail.victim.character_id);
  unnamedIds.add(mail.victim.corporation_id);
  unnamedIds.add(mail.victim.alliance_id!);
  unnamedIds.add(mail.victim.ship_type_id);

  if (mail.victim.items) {
    for (let item of mail.victim.items) {
      unnamedIds.add(item.item_type_id);
    }
  }
  for (let attacker of mail.attackers) {
    unnamedIds.add(attacker.ship_type_id!);
    unnamedIds.add(attacker.weapon_type_id);
    unnamedIds.add(attacker.character_id);
    unnamedIds.add(attacker.corporation_id);
    unnamedIds.add(attacker.alliance_id);
    unnamedIds.add(attacker.faction_id);
  }
  return await fetchEveNames(unnamedIds);
}
