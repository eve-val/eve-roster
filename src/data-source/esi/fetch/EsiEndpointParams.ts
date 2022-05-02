import { EsiEndpoint, Private } from "../EsiEndpoint.js";

/**
 * Given an ESI endpoint, assembles a unified "params" type object for use in
 * fetchEsi().
 *
 * - Adds any pathVars
 * - Adds any query params
 * - If the endpoint is private, adds a required _token property
 * - If the endpoint has a body, adds a required _body property
 */
export type EsiEndpointParams<T extends EsiEndpoint> = DefaultEmpty<
  T["pathVars"]
> &
  DefaultEmpty<T["query"]> &
  (T extends PrivateEndpoint ? { _token: string } : { _token?: undefined }) &
  (T["body"] extends object | string | number | boolean
    ? { _body: T["body"] }
    : { _body?: undefined });

type DefaultEmpty<T> = T extends undefined ? {} : T;

interface PrivateEndpoint {
  access: Private;
}
