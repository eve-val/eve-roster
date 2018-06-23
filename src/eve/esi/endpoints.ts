import { FetchMethod, Private } from "./EsiEndpoint";


/**
 * Supported endpoints in the ESI API
 *
 * Pass these to fetchEndpoint() in order to retrieve an endpoint.
 */


export const ESI_CHARACTERS_$characterId_ROLES = {
  method: FetchMethod.GET,
  path: '/v2/characters/${characterId}/roles',
  pathBindings: {} as {
    characterId: number,
  },
  params: null,
  access: Private.ACCESS,
  response: {} as {
    roles: string[],
    roles_at_hq?: string[],
    roles_at_base?: string[],
    roles_at_other?: string[],
  },
};

export const ESI_CORPORATIONS_$corporationId_MEMBERS = {
  method: FetchMethod.GET,
  path: '/v3/corporations/${corporationId}/members',
  pathBindings: {} as {
    corporationId: number,
  },
  params: null,
  access: Private.ACCESS,
  response: [] as number[],
};

export const ESI_CORPORATIONS_$corporationId_TITLES = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/titles/',
  pathBindings: {} as {
    corporationId: number,
  },
  params: null,
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
  pathBindings: {} as {
    corporationId: number,
  },
  params: null,
  access: Private.ACCESS,
  response: [] as Array<{
    character_id: number,
    titles: number[],
  }>,
};

export const ESI_CORPORATIONS_$corporationId_ROLES = {
  method: FetchMethod.GET,
  path: '/v1/corporations/${corporationId}/roles/',
  pathBindings: {} as {
    corporationId: number,
  },
  params: null,
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
  pathBindings: {} as {
    corporationId: number,
  },
  params: null,
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
