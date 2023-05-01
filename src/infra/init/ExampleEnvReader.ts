import { getEnv } from "./Env.js";

const savedEnv = getEnv();
const savedCookieValue = getEnv().COOKIE_SECRET;

/**
 * An example class used to demonstrate how to write tests for code that reads
 * env state.
 *
 * See its accompanying test for more info.
 */
export class ExampleEnvReader {
  constructor() {}

  getCookieSecret() {
    return getEnv().COOKIE_SECRET;
  }

  getSavedCookieSecret() {
    return savedCookieValue;
  }
}

export function exampleFunctionThatDependsOnEnv() {
  return `The hostname is ${savedEnv.HOSTNAME}`;
}
