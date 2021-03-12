import { number } from "../../util/express/schemaVerifier";
import { EsiAsset } from "./EsiAsset";
import { FetchMethod, Private, Public } from "./EsiEndpoint";
import { EsiKillmail } from "./EsiKillmail";


/**
 * Supported endpoints in the ESI API
 *
 * Pass these to fetchEsi() in order to retrieve an endpoint.
 */


export const ESI_CHARACTERS_$characterId = {
  method: FetchMethod.GET,
  path: '/v4/characters/${characterId}/',
  pathVars: {} as {
    characterId: number,
  },
  access: Public.ACCESS,
  response: {} as {
    alliance_id?: number,
    ancestry_id?: number,
    birthday: string,
    bloodline_id: number,
    corporation_id: number,
    description?: number,
    faction_id?: number,
    gender: 'female' | 'male',
    name: string,
    race_id: number,
    security_status?: number,
  },
};

export const ESI_CHARACTERS_$characterId_ASSETS = {
  method: FetchMethod.GET,
  path: '/v5/characters/${characterId}/assets',
  pathVars: {} as {
    characterId: number,
  },
  query: {
    page: 1 as number,
  },
  access: Private.ACCESS,
  response: {} as EsiAsset[],
};

export const ESI_CHARACTERS_$characterId_ASSETS_NAMES = {
  method: FetchMethod.POST,
  path: '/v1/characters/${characterId}/assets/names',
  pathVars: {} as {
    characterId: number,
  },
  body: [] as number[],
  access: Private.ACCESS,
  response: {} as {
    item_id: number,
    name: string,
  }[],
};

export const ESI_CHARACTERS_$characterId_ROLES = {
  method: FetchMethod.GET,
  path: '/v2/characters/${characterId}/roles',
  pathVars: {} as {
    characterId: number,
  },
  access: Private.ACCESS,
  response: {} as {
    roles: string[],
    roles_at_hq?: string[],
    roles_at_base?: string[],
    roles_at_other?: string[],
  },
};

export const ESI_CHARACTERS_$characterId_LOCATION = {
  method: FetchMethod.GET,
  path: '/v1/characters/${characterId}/location/',
  pathVars: {} as {
    characterId: number,
  },
  access: Private.ACCESS,
  response: {} as {
    solar_system_id: number,
    station_id?: number,
    structure_id?: number,
  },
};

export const ESI_CHARACTERS_$characterId_SHIP = {
  method: FetchMethod.GET,
  path: '/v1/characters/${characterId}/ship/',
  pathVars: {} as {
    characterId: number,
  },
  access: Private.ACCESS,
  response: {} as {
    ship_item_id: number,
    ship_name: string,
    ship_type_id: number,
  },
};

export const ESI_CHARACTERS_$characterId_SKILLQUEUE = {
  method: FetchMethod.GET,
  path: '/v2/characters/${characterId}/skillqueue/',
  pathVars: {} as {
    characterId: number,
  },
  access: Private.ACCESS,
  response: {} as {
    skill_id: number,
    queue_position: number,
    finished_level: number,
    start_date?: string,
    finish_date?: string,
    level_start_sp?: number,
    level_end_sp?: number,
    training_start_sp?: number,
  }[],
}

export const ESI_CHARACTERS_$characterId_SKILLS = {
  method: FetchMethod.GET,
  path: '/v4/characters/${characterId}/skills/',
  pathVars: {} as {
    characterId: number,
  },
  access: Private.ACCESS,
  response: {} as {
    skills: {
      skill_id: number,
      active_skill_level: number,
      skillpoints_in_skill: number,
      trained_skill_level: number,
    }[],
    total_sp: number,
    unallocated_sp?: number,
  },
}

export const ESI_CORPORATIONS_$corporationId = {
  method: FetchMethod.GET,
  path: '/v4/corporations/${corporationId}/',
  pathVars: {} as {
    corporationId: number,
  },
  access: Public.ACCESS,
  response: {} as {
    alliance_id?: number,
    ceo_id: number,
    creator_id: number,
    date_founded?: string,
    description?: string,
    faction_id?: number,
    home_station_id?: number,
    member_count: number,
    name: string,
    shares?: number,
    tax_rate: number,
    ticker: string,
    url?: string,
    war_eligible?: boolean,
  },
};

export const ESI_CORPORATIONS_$corporationId_MEMBERS = {
  method: FetchMethod.GET,
  path: '/v3/corporations/${corporationId}/members',
  pathVars: {} as {
    corporationId: number,
  },
  access: Private.ACCESS,
  response: [] as number[],
};

export const ESI_CORPORATIONS_$corporationId_TITLES = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/titles/',
  pathVars: {} as {
    corporationId: number,
  },
  access: Private.ACCESS,
  response: [] as Array<{
    title_id: number,
    name: string,
    roles: string[],
    roles_at_base: string[],
    roles_at_hq: string[],
    roles_at_other: string[],
    grantable_roles: string[],
    grantable_roles_at_base: string[],
    grantable_roles_at_hq: string[],
    grantable_roles_at_other: string[],
  }>,
};

export const ESI_CORPORATIONS_$corporationId_MEMBERS_TITLES = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/members/titles/',
  pathVars: {} as {
    corporationId: number,
  },
  access: Private.ACCESS,
  response: [] as Array<{
    character_id: number,
    titles: number[],
  }>,
};

export const ESI_CORPORATIONS_$corporationId_ROLES = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/roles/',
  pathVars: {} as {
    corporationId: number,
  },
  access: Private.ACCESS,
  response: [] as Array<{
    character_id: number,
    roles?: string[],
    grantable_roles?: string[],
  }>,
};

export const ESI_CORPORATIONS_$corporationId_MEMBERTRACKING = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/membertracking/',
  pathVars: {} as {
    corporationId: number,
  },
  access: Private.ACCESS,
  response: [] as Array<{
    character_id: number,
    start_date: string,
    base_id: number,
    logon_date: string,
    logoff_date: string,
    location_id: number,
    ship_type_id: number,
  }>,
};

export const ESI_CORPORATIONS_$corporationId_KILLMAILS_RECENT = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/killmails/recent/',
  pathVars: {} as {
    corporationId: number,
  },
  query: {
    page: 1 as number,
  },
  access: Private.ACCESS,
  response: [] as Array<{
    killmail_hash: string,
    killmail_id: number,
  }>,
};

export const ESI_KILLMAILS_$killmailId_$killmailHash = {
  method: FetchMethod.GET,
  path: '/v1/killmails/${killmailId}/${killmailHash}/',
  pathVars: {} as {
    killmailId: number,
    killmailHash: string,
  },
  access: Public.ACCESS,
  response: {} as EsiKillmail,
};

export const ESI_UI_OPENWINDOW_INFORMATION = {
  method: FetchMethod.POST,
  path: '/v1/ui/openwindow/information/',
  query: {
    target_id: 47 as number,
  },
  access: Private.ACCESS,
  response: undefined as void,
}

export const ESI_UNIVERSE_NAMES = {
  method: FetchMethod.POST,
  path: '/v3/universe/names/',
  pathVars: {},
  body: [] as number[],
  access: Public.ACCESS,
  response: {} as {
    category:
        | 'alliance'
        | 'character'
        | 'constellation'
        | 'corporation'
        | 'inventory_type'
        | 'region'
        | 'solar_system'
        | 'station',
    id: number,
    name: string,
  }[],
};

export const ESI_UNIVERSE_STRUCTURES_$structureId = {
  method: FetchMethod.GET,
  path: '/v2/universe/structures/${structureId}/',
  pathVars: {} as {
    structureId: number,
  },
  access: Private.ACCESS,
  response: {} as {
    name: string,
    owner_id: number,
    solar_system_id: number,
    type_id?:number,
  },
};
