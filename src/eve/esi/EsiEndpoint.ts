
/**
 * Defines an endpoint in the ESI HTTP API.
 *
 * Pass instances of this to fetchEndpoint() in order to make the request.
 */
export interface BaseEsiEndpoint {
  method: FetchMethod,
  path: string,
  pathBindings: object,
  response: object | void,
}

export interface PublicEsiEndpoint extends BaseEsiEndpoint {
  access: Public.ACCESS,
  params: null,
}

export interface PrivateEsiEndpoint extends BaseEsiEndpoint {
  access: Private.ACCESS,
  params: null,
}

export interface PublicEsiEndpointWithParams extends BaseEsiEndpoint {
  access: Public.ACCESS,
  params: object,
}

export interface PrivateEsiEndpointWithParams extends BaseEsiEndpoint {
  access: Private.ACCESS,
  params: object,
}

export enum FetchMethod {
  GET = 'get',
  POST = 'post',
}

// These would normally be a single enum (or string union), but in order to make
// our endpoint literals (in endpoints.ts) pick up the right types for their
// access properties, these need to be separate types.
export enum Public { ACCESS }
export enum Private { ACCESS }
