export interface EsiEndpoint {
  path: string;
  method: FetchMethod;
  access: Public | Private;
  pathVars?: object;
  query?: object;
  body?: object | string | number | boolean;
  response: object | void;
}

export enum FetchMethod {
  GET = "get",
  POST = "post",
}

// These would normally be a single enum (or string union), but in order to make
// our endpoint literals (in endpoints.ts) pick up the right types for their
// access properties, these need to be separate types.
export enum Public {
  ACCESS,
}
export enum Private {
  ACCESS,
}
