/**
 * JSON format for killmails returned from ESI. Internally, most killmails are
 * represented by ZKillmails, a superset of EsiKillmail.
 */
export interface EsiKillmail {
  killmail_id: number;
  killmail_time: string;
  victim: Victim;
  attackers: Attacker[];
  solar_system_id: number;
}

/*
 * A note about victims and attackers
 *
 * Many different entities in EVE can be both victims and attackers -- ships
 * certainly, but also structures, NPCs, NPCs that work for corporations, NPCs
 * that are treated like players, and even certain environmental effects like
 * poisonous clouds. Sometimes, entities like ships and structures are
 * associated with players; sometimes they aren't.
 *
 * Below are a few common patterns, but in general your code must expect that
 * ANY combination of the optional fields below can occur. Note that CCP has
 * reworked how NPC ships are represented; these used to be primarily associated
 * with a faction_id. Now, many NPC ships have an associated corporation and
 * faction_id has been repurposed to (sometimes) represent faction warfare
 * alignment (and can be present on real players as a result).
 *
 * Finally, a few oddities. The ship_type_id property is present for most
 * entities but is sometimes left blank for reasons known only to CCP. If an
 * attacker dies before their victim does, their ship_type_id is sometimes
 * reported as a capsule rather than the ship they were flying (or is left
 * blank). In certain rare cases the ship_type_id will be omitted but
 * weapon_type_id will be set to the actual ship ID (rather than a weapon).
 * This is most common on field-applying ships such as HICs.
 *
 * Examples:
 *
 * Player-owned ship or player-owned structure (e.g. MTU)
 * {
 *  character_id,
 *  corpororation_id,
 *  alliance_id?,
 *  faction_id?
 * }
 *
 * Corporation-owned structure
 * {
 *  corporation_id,
 *  alliance_id?,
 * }
 *
 * Normal NPC (pirates, CONCORD, faction police, etc.)
 * {
 *  corporation_id,
 * }
 *
 * "Character" NPC (Arithmos Tyrranos)
 * {
 *  character_id,
 *  corporation_id,
 * }
 *
 * Old school NPCs (these are far less common but still exist)
 * {
 *  faction_id,
 * }
 *
 * Environment effects
 * {
 *  faction_id, // This is often (always?) the faction 500021 ("Unknown")
 * }
 *
 */

export interface Victim {
  damage_taken: number;
  ship_type_id: number;
  character_id?: number;
  corporation_id?: number;
  alliance_id?: number;
  faction_id?: number;
  items?: (DestroyedItem | DroppedItem)[];
  position?: {
    x: number;
    y: number;
    z: number;
  };
}

export interface Attacker {
  final_blow: boolean;
  damage_done: number;
  security_status: 0;
  ship_type_id?: number;
  // Sometimes, this is actually a ship type ID. Usually when the ship type ID
  // itself is undefined. ¯\_(ツ)_/¯
  weapon_type_id?: number;
  character_id?: number;
  corporation_id?: number;
  alliance_id?: number;
  faction_id?: number;
}

export interface DestroyedItem {
  item_type_id: number;
  singleton: number;
  flag: number;
  quantity_destroyed: number;
}

export interface DroppedItem {
  item_type_id: number;
  singleton: number;
  flag: number;
  quantity_dropped: number;
}
