import { FetchMethod, Private, Public } from "./EsiEndpoint";


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
