/**
 * The JSON format that Zkillboard uses to represent killmails.
 */
export interface ZKillmail {
  killmail_id: number,
  killmail_time: string,
  victim: {
    damage_taken: number,
    ship_type_id: number,
    character_id: number,
    corporation_id: number,
    alliance_id: number | undefined,
    items: (DestroyedItem | DroppedItem)[],
    position: {
      x: number,
      y: number,
      z: number,
    }
  },
  attackers: Attacker[],
  solar_system_id: number,
  zkb: {
    locationID: number,
    hash: string,
    fittedValue: number,
    totalValue: number,
    points: number,
    npc: boolean,
    solo: boolean,
    awox: boolean,
  }
}

export interface DestroyedItem {
  item_type_id: number,
  singleton: number,
  flag: number,
  quantity_destroyed: number,
}

export interface DroppedItem {
  item_type_id: number,
  singleton: number,
  flag: number,
  quantity_dropped: number,
}

export type Attacker = NpcAttacker | PlayerAttacker | StructureAttacker;

export interface BaseAttacker {
  final_blow: boolean,
  damage_done: number,
  ship_type_id: number | undefined,
  security_status: 0,
}

export interface NpcAttacker extends BaseAttacker {
  faction_id: number,
}

export interface PlayerAttacker extends BaseAttacker {
  character_id: number,
  corporation_id: number,
  alliance_id: number | undefined,
  weapon_type_id: number,
}

export interface StructureAttacker extends BaseAttacker {
  corporation_id: number,
}

export function isPlayerAttacker(
    attacker: Attacker): attacker is PlayerAttacker {
  return (<PlayerAttacker>attacker).character_id != undefined;
}

export function isStructureAttacker(
    attacker: Attacker): attacker is StructureAttacker {
  return (<StructureAttacker>attacker).corporation_id != undefined
      && (<PlayerAttacker>attacker).character_id == undefined;
}
