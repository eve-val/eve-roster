import { jsonEndpoint } from "../../../infra/express/protectedEndpoint.js";
import { Tnex } from "../../../db/tnex/index.js";
import { Killmail_$Id_GET } from "../../../../shared/route/api/killmail/type_killmail_$id_GET.js";
import { AccountPrivileges } from "../../../infra/express/privileges.js";
import { idParam } from "../../../util/express/paramVerifier.js";
import { dao } from "../../../db/dao.js";
import { NotFoundError } from "../../../error/NotFoundError.js";
import { SimpleNumMap, nil } from "../../../../shared/util/simpleTypes.js";
import { fetchEveNames } from "../../../data-source/esi/names.js";
import {
  DestroyedItem,
  DroppedItem,
  EsiKillmail,
} from "../../../../shared/types/esi/EsiKillmail.js";
import {
  KmFitting,
  KmHoldSection,
  KmSlotSection,
  KmItem,
} from "../../../../shared/types/killmail/KmFitting.js";
import {
  arrayToMap,
  getWithDefault,
} from "../../../../shared/util/collections.js";
import { TYPE_CATEGORY_CHARGE } from "../../../eve/constants/categories.js";
import { buildLogger } from "../../../infra/logging/buildLogger.js";
import { fetchAverageMarketPrices } from "../../../data-source/esi/market/fetchAverageMarketPrices.js";
import { FittingSection } from "../../../data-source/esi/fitting/FittingSection.js";
import { Dogma } from "../../../eve/constants/dogma.js";

const logger = buildLogger("killmail_GET");

/**
 * Returns the data blob for a killmail as well as related metadata.
 */
export default jsonEndpoint(
  (req, res, db, account, privs): Promise<Killmail_$Id_GET> => {
    const killmailId = idParam(req, "id");

    return handleEndpoint(db, privs, killmailId);
  },
);

async function handleEndpoint(
  db: Tnex,
  privs: AccountPrivileges,
  killmailId: number,
) {
  const row = await dao.killmail.getKillmail(db, killmailId);
  if (row == null) {
    throw new NotFoundError();
  }

  const killmail = row.km_data;

  const [shipSlots, itemCategorizer, [prices], names] = await Promise.all([
    loadShipSlots(db, killmail.victim.ship_type_id),
    loadItemCategorizer(db, killmail),
    buildPriceMap(killmail, killmail.zkb.prices),
    buildNameMap(killmail),
  ]);
  const fitting = generateKmFitting(killmail, shipSlots, itemCategorizer);

  delete killmail.zkb.prices;

  return {
    killmail,
    fitting,
    prices: prices,
    meta: {
      hash: row.km_data.zkb.hash,
    },
    names,
  };
}

async function buildPriceMap(
  mail: EsiKillmail,
  prices: SimpleNumMap<number> | undefined,
): Promise<[SimpleNumMap<number>, "original" | "current"]> {
  if (prices != undefined) {
    return [prices, "original"];
  }

  const itemSet = new Set<number>();
  itemSet.add(mail.victim.ship_type_id);
  for (const item of mail.victim.items ?? []) {
    itemSet.add(item.item_type_id);
  }
  const newPrices = await fetchAverageMarketPrices(Array.from(itemSet));
  return [Object.fromEntries(newPrices), "current"];
}

async function buildNameMap(mail: EsiKillmail) {
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

async function loadItemCategorizer(
  db: Tnex,
  mail: EsiKillmail,
): Promise<ItemCategorizer> {
  const items = new Set<number>();
  for (const item of mail.victim.items ?? []) {
    items.add(item.item_type_id);
  }

  const rows = await dao.sde.getTypes(db, Array.from(items), [
    "styp_id",
    "styp_category",
  ]);
  const categoryMap = new Map<number, number>();
  for (const row of rows) {
    categoryMap.set(row.styp_id, row.styp_category);
  }

  return new ItemCategorizerImpl(categoryMap);
}

class ItemCategorizerImpl implements ItemCategorizer {
  constructor(private categoryMap: Map<number, number>) {}

  isCharge(typeId: number): boolean {
    const category = this.categoryMap.get(typeId);
    if (category == undefined) {
      logger.warn(`Unknown type ${typeId} -- do you need to update the SDE?`);
    }
    return category == TYPE_CATEGORY_CHARGE;
  }
}

async function loadShipSlots(
  db: Tnex,
  shipTypeId: number,
): Promise<Map<string, number>> {
  const attrRows = await dao.sde.getTypeAttributes(
    db,
    [shipTypeId],
    [
      Dogma.attr.LOW_SLOTS.id,
      Dogma.attr.MID_SLOTS.id,
      Dogma.attr.HIGH_SLOTS.id,
      Dogma.attr.RIG_SLOTS.id,
    ],
    ["sattr_id", "sta_valueFloat"],
  );

  const attrMap = arrayToMap(attrRows, "sattr_id");
  const resultMap = new Map<string, number>();

  resultMap.set(
    "high",
    attrMap.get(Dogma.attr.HIGH_SLOTS.id)?.sta_valueFloat ?? 0,
  );
  resultMap.set(
    "mid",
    attrMap.get(Dogma.attr.MID_SLOTS.id)?.sta_valueFloat ?? 0,
  );
  resultMap.set(
    "low",
    attrMap.get(Dogma.attr.LOW_SLOTS.id)?.sta_valueFloat ?? 0,
  );
  resultMap.set(
    "rig",
    attrMap.get(Dogma.attr.RIG_SLOTS.id)?.sta_valueFloat ?? 0,
  );

  return resultMap;
}

function generateKmFitting(
  km: EsiKillmail,
  shipSlots: Map<string, number>,
  categorizer: ItemCategorizer,
): KmFitting {
  const slotSections = new Map<string, KmSlotSection>();
  const holdSections = new Map<string, KmHoldSection>();

  // Prefill slot sections so that we can specify the total number of slots
  const prefillSections = ["high", "mid", "low", "rig"];
  for (const pfName of prefillSections) {
    const section = FittingSection.fromSectionName(pfName);
    if (section == null) {
      continue;
    }
    slotSections.set(pfName, {
      ...section,
      type: "slots" as const,
      slots: new Array(shipSlots.get(section.name) ?? 0).fill(null),
    });
  }

  for (const item of km.victim.items ?? []) {
    const assignment = FittingSection.fromInventoryFlag(item.flag);

    if (assignment.section.type == "slots") {
      const section = getWithDefault(
        slotSections,
        assignment.section.name,
        () => {
          return {
            ...assignment.section,
            type: "slots" as const,
            slots: [],
          };
        },
      );

      let slot = section.slots[assignment.slotId];
      if (slot == undefined) {
        slot = {};
        section.slots[assignment.slotId] = slot;
      }

      const kmItem = toKmItem(item);

      if (categorizer.isCharge(kmItem.typeId)) {
        slot.charge = kmItem;
      } else {
        slot.module = kmItem;
      }
    } else {
      const section = getWithDefault(
        holdSections,
        assignment.section.type,
        () => {
          return {
            ...assignment.section,
            type: "hold" as const,
            hold: [],
          };
        },
      );
      section.hold.push(toKmItem(item));
    }
  }

  const sections = [...slotSections.values(), ...holdSections.values()];
  sections.sort((a, b) => a.rank - b.rank);

  return {
    ship: km.victim.ship_type_id,
    sections,
  };
}

function toKmItem(esiItem: DestroyedItem | DroppedItem): KmItem {
  if ("quantity_destroyed" in esiItem) {
    return {
      typeId: esiItem.item_type_id,
      status: "destroyed",
      count: esiItem.quantity_destroyed,
    };
  } else {
    return {
      typeId: esiItem.item_type_id,
      status: "dropped",
      count: esiItem.quantity_dropped,
    };
  }
}

interface ItemCategorizer {
  isCharge(typeId: number): boolean;
}
