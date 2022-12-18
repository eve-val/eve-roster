import { jest } from "@jest/globals";

/**
 * Wrapper around [jest.mock] that returns a typesafe instance of the mocked
 * module.
 *
 * @param path The path of the module to mock, relative to the root of the
 *    source tree, e.g. "src/foo/bar/baz" not "../../src/foo/bar/baz"
 * @param implementation The mock or fake module to use instead of the real one
 * @returns The implementation passed in
 */
export function mockModule<T>(path: string, implementation: T): T {
  jest.mock(`../../${path}`, () => implementation);
  return implementation;
}
