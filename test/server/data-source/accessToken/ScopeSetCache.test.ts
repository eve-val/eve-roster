import { expect, test } from "@jest/globals";
import { mockEnv } from "../../infra/init/FakeEnv.js";

mockEnv();

import { ScopeSetCache } from "../../../../src/server/data-source/accessToken/ScopeSetCache.js";

test("Set contains all elements", () => {
  const cache = new ScopeSetCache();

  const set1 = cache.getScopeSet(["scopeA", "scopeB", "scopeC"]);

  expect(Array.from(set1).sort()).toEqual(["scopeA", "scopeB", "scopeC"]);
});

test("Same set for same scope sets", () => {
  const cache = new ScopeSetCache();

  const set1 = cache.getScopeSet(["scopeA", "scopeB", "scopeC"]);
  const set2 = cache.getScopeSet(["scopeA", "scopeB", "scopeC"]);

  expect(set1).toBe(set2);
});

test("Scope order doesn't matter", () => {
  const cache = new ScopeSetCache();

  const set1 = cache.getScopeSet(["scopeA", "scopeB", "scopeC"]);
  const set2 = cache.getScopeSet(["scopeC", "scopeA", "scopeB"]);

  expect(set1).toBe(set2);
});

test("Different scopes are different sets", () => {
  const cache = new ScopeSetCache();

  const set1 = cache.getScopeSet(["scopeA", "scopeB", "scopeC"]);
  const set2 = cache.getScopeSet(["scopeC", "scopeB"]);

  expect(set2).not.toBe(set1);
});
