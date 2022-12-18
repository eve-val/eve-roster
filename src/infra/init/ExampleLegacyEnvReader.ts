import { getEnvLegacy } from "./Env.js";

const savedEnv = getEnvLegacy();
const savedCookieValue = getEnvLegacy().COOKIE_SECRET;

/**
 * An example class used to demonstrate how to write tests for old code that
 * that reads env state via the legacy env mechanism.
 *
 * See its accompanying test for more info.
 */
export class ExampleLegacyEnvReader {
  constructor() {
    // Should really pass an instance of Env in here instead, but we have
    // legacy users for whom the plumbing required would be impractical
  }

  getCookieSecret() {
    return getEnvLegacy().COOKIE_SECRET;
  }

  getSavedCookieSecret() {
    return savedCookieValue;
  }
}

export function exampleFunctionThatDependsOnLegacyEnv() {
  return `The hostname is ${savedEnv.HOSTNAME}`;
}
