import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { Tnex } from "../../../db/tnex/index.js";
import { AccountPrivileges } from "../../../infra/express/privileges.js";
import { idParam } from "../../../util/express/paramVerifier.js";
import { dao } from "../../../db/dao.js";
import { NotFoundError } from "../../../error/NotFoundError.js";
import { ZKillmail } from "../../../data-source/zkillboard/ZKillmail.js";
import { SimpleNumMap, nil } from "../../../../shared/util/simpleTypes.js";
import { fetchEveNames } from "../../../data-source/esi/names.js";

export interface Output {
  killmail: ZKillmail;
  names: SimpleNumMap<string>;
}

/**
 * Returns the data blob for a killmail as well as the names of any associated
 * entities (participants, items, etc.).
 */
export default jsonEndpoint((req, res, db, account, privs): Promise<Output> => {
  const killmailId = idParam(req, "id");

  return handleEndpoint(db, privs, killmailId);
});

async function handleEndpoint(
  db: Tnex,
  privs: AccountPrivileges,
  killmailId: number,
) {
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
  unnamedIds.add(mail.victim.alliance_id);
  unnamedIds.add(mail.victim.ship_type_id);

  if (mail.victim.items) {
    for (const item of mail.victim.items) {
      unnamedIds.add(item.item_type_id);
    }
  }
  for (const attacker of mail.attackers) {
    unnamedIds.add(attacker.ship_type_id);
    unnamedIds.add(attacker.weapon_type_id);
    unnamedIds.add(attacker.character_id);
    unnamedIds.add(attacker.corporation_id);
    unnamedIds.add(attacker.alliance_id);
    unnamedIds.add(attacker.faction_id);
  }
  return await fetchEveNames(unnamedIds);
}
