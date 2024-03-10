import { afterEach, beforeEach, expect, test } from "@jest/globals";
import { mockDao } from "../../mocks/db/fakeDao.js";
import { mockEnv } from "../../infra/init/FakeEnv.js";
import { mockClock } from "../../mocks/util/wrapped/fakeClock.js";

const fakeDao = mockDao();
const fakeEnv = mockEnv();
const fakeClock = mockClock();

import { dao } from "../../../../src/server/db/dao.js";
import { AccessTokenLoader } from "../../../../src/server/data-source/accessToken/AccessTokenLoader.js";
import { AccessToken } from "../../../../src/server/db/tables.js";
import { flushPromises } from "../../../test_infra/util/flush.js";
import { FakeDb, buildFakeDb } from "../../../test_infra/db/FakeDb.js";
import { AxiosError, AxiosHeaders } from "axios";
import {
  AccessTokenResult,
  TokenResultType,
} from "../../../../src/server/data-source/accessToken/AccessTokenResult.js";

let db!: FakeDb;
let initialRows!: AccessToken[];
let loader!: AccessTokenLoader;
let loaderConfig!: ReturnType<typeof buildDefaultConfig>;

beforeEach(() => {
  fakeDao.reset();
  fakeClock.setNow(0);

  db = buildFakeDb();

  initialRows = buildDefaultRows();
  db.tables.accessToken.initialize(initialRows);

  loaderConfig = buildDefaultConfig();
  loader = new AccessTokenLoader(fakeEnv.getEnv(), loaderConfig);
});

afterEach(async () => {
  await flushPromises();
  await loader.waitForDbCommit();
});

test("Fake dao functions properly", async () => {
  const result = await dao.accessToken.getAll(db, [47, 42]);

  expect(result).toEqual(
    initialRows.filter((row) => [47, 42].includes(row.accessToken_character)),
  );
});

test("Basic end to end test", async () => {
  const result = await loader.fetchAccessTokens(
    db,
    [21, 47],
    ["scopeA", "scopeB"],
  );

  expect(Array.from(result.values())).toEqual([
    {
      kind: TokenResultType.SUCCESS,
      characterId: 21,
      token: "accessToken_rt21_1",
    },
    {
      kind: TokenResultType.MISSING_SCOPES,
      characterId: 47,
      missingScopes: ["scopeA"],
    },
  ]);
});

test("Multiple refresh requests for the same token are coalesced", async () => {
  const promise1 = loader.fetchAccessTokens(db, [21, 47], []);
  const promise2 = loader.fetchAccessTokens(db, [21, 42], []);
  const promise3 = loader.fetchAccessTokens(db, [21], []);

  const [result1, result2, result3] = await Promise.all([
    promise1,
    promise2,
    promise3,
  ]);

  expect(loaderConfig.refreshCounts.get("rt21")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt42")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt47")).toBe(1);

  expect(tokenResult(result1, 21)).toBe("accessToken_rt21_1");
  expect(tokenResult(result1, 47)).toBe("accessToken_rt47_1");

  expect(tokenResult(result2, 21)).toBe("accessToken_rt21_1");
  expect(tokenResult(result2, 42)).toBe("accessToken_rt42_1");

  expect(tokenResult(result3, 21)).toBe("accessToken_rt21_1");
});

test("Multiple synchronous requests share the same DB load", async () => {
  const promise1 = loader.fetchAccessTokens(db, [33], []);
  const promise2 = loader.fetchAccessTokens(db, [21], []);
  const promise3 = loader.fetchAccessTokens(db, [42], []);

  await Promise.all([promise1, promise2, promise3]);

  expect(fakeDao.accessToken.calls.getAll).toEqual([[33, 21, 42]]);
});

test("Changes are batched to the db", async () => {
  const promise1 = loader.fetchAccessTokens(db, [33], []);
  const promise2 = loader.fetchAccessTokens(db, [21], []);
  const promise3 = loader.fetchAccessTokens(db, [42], []);

  await Promise.all([promise1, promise2, promise3]);
  await loader.waitForDbCommit();

  expect(dbRow(33)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt33_1",
      accessToken_accessTokenExpires: 10000,
    }),
  );
  expect(dbRow(21)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt21_1",
      accessToken_accessTokenExpires: 10000,
    }),
  );
  expect(dbRow(42)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt42_1",
      accessToken_accessTokenExpires: 10000,
    }),
  );

  expect(fakeDao.accessToken.calls.updateAll.callCount).toBe(1);
});

test("Multiple generations of changes are processed", async () => {
  loader.fetchAccessTokens(db, [33], []);
  loader.fetchAccessTokens(db, [21], []);

  await flushPromises();
  await loader.waitForDbCommit();

  loader.fetchAccessTokens(db, [42], []);

  await flushPromises();
  await loader.waitForDbCommit();

  expect(dbRow(42)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt42_1",
      accessToken_accessTokenExpires: 10000,
    }),
  );

  expect(fakeDao.accessToken.calls.updateAll.callCount).toBe(2);
});

test("Loaded tokens are not loaded again", async () => {
  await loader.fetchAccessTokens(db, [21, 33], []);
  await loader.fetchAccessTokens(db, [21, 47], []);

  expect(fakeDao.accessToken.calls.getAll).toEqual([[21, 33], [47]]);
});

test("Fresh tokens are not refreshed again", async () => {
  await loader.fetchAccessTokens(db, [21, 55], []);
  await loader.fetchAccessTokens(db, [21, 55, 47], []);

  expect(loaderConfig.refreshCounts.get("rt21")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt55")).toBe(undefined);
  expect(loaderConfig.refreshCounts.get("rt47")).toBe(1);
});

test("Fresh tokens are re-refreshed after time passes", async () => {
  await loader.fetchAccessTokens(db, [21, 55], []);
  expect(loaderConfig.refreshCounts.get("rt21")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt55")).toBe(undefined);

  fakeClock.setNow(4500);
  await loader.fetchAccessTokens(db, [21, 55], []);
  expect(loaderConfig.refreshCounts.get("rt21")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt55")).toBe(1);

  fakeClock.setNow(10000);
  await loader.fetchAccessTokens(db, [21, 55], []);
  expect(loaderConfig.refreshCounts.get("rt21")).toBe(2);
  expect(loaderConfig.refreshCounts.get("rt55")).toBe(1);

  fakeClock.setNow(30000);
  const results = await loader.fetchAccessTokens(db, [21, 55, 47], []);
  await loader.waitForDbCommit();

  expect(results.get(21)).toEqual({
    kind: TokenResultType.SUCCESS,
    characterId: 21,
    token: "accessToken_rt21_3",
  });
  expect(results.get(55)).toEqual({
    kind: TokenResultType.SUCCESS,
    characterId: 55,
    token: "accessToken_rt55_2",
  });
  expect(results.get(47)).toEqual({
    kind: TokenResultType.SUCCESS,
    characterId: 47,
    token: "accessToken_rt47_1",
  });

  expect(loaderConfig.refreshCounts.get("rt21")).toBe(3);
  expect(loaderConfig.refreshCounts.get("rt55")).toBe(2);
  expect(loaderConfig.refreshCounts.get("rt47")).toBe(1);

  expect(dbRow(21)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt21_3",
      accessToken_accessTokenExpires: 40000,
    }),
  );
  expect(dbRow(55)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt55_2",
      accessToken_accessTokenExpires: 40000,
    }),
  );
  expect(dbRow(47)).toEqual(
    expect.objectContaining({
      accessToken_accessToken: "accessToken_rt47_1",
      accessToken_accessTokenExpires: 40000,
    }),
  );
});

test("Tokens are properly rejected if their scopes don't match", async () => {
  // 33's scopes are B and C

  const successResult = {
    kind: TokenResultType.SUCCESS,
    characterId: 33,
    token: "accessToken_rt33_1",
  };

  const errorResult = {
    kind: TokenResultType.MISSING_SCOPES,
    characterId: 33,
    missingScopes: ["scopeA"],
  };

  let result;
  result = await loader.fetchAccessTokens(db, [33], ["scopeA"]);
  expect(result.get(33)).toEqual(errorResult);

  result = await loader.fetchAccessTokens(db, [33], ["scopeB"]);
  expect(result.get(33)).toEqual(successResult);

  result = await loader.fetchAccessTokens(db, [33], ["scopeC"]);
  expect(result.get(33)).toEqual(successResult);

  result = await loader.fetchAccessTokens(db, [33], ["scopeB", "scopeC"]);
  expect(result.get(33)).toEqual(successResult);

  result = await loader.fetchAccessTokens(db, [33], ["scopeC", "scopeB"]);
  expect(result.get(33)).toEqual(successResult);

  result = await loader.fetchAccessTokens(db, [33], ["scopeA", "scopeC"]);
  expect(result.get(33)).toEqual(errorResult);

  result = await loader.fetchAccessTokens(db, [33], ["scopeC", "scopeC"]);
  expect(result.get(33)).toEqual(successResult);
});

test("500 error encountered", async () => {
  const axiosError = axiosResponseError(500);
  loaderConfig.setRefreshProvider((refreshToken) => {
    if (refreshToken == "rt33") {
      throw axiosError;
    }
    return null;
  });

  const result = await loader.fetchAccessTokens(
    db,
    [21, 33, 47],
    ["scopeB", "scopeC"],
  );

  expect(Array.from(result.values())).toEqual([
    {
      kind: TokenResultType.SUCCESS,
      characterId: 21,
      token: "accessToken_rt21_1",
    },
    {
      kind: TokenResultType.HTTP_FAILURE,
      characterId: 33,
      error: axiosError,
    },
    {
      kind: TokenResultType.MISSING_SCOPES,
      characterId: 47,
      missingScopes: ["scopeC"],
    },
  ]);

  loaderConfig.setRefreshProvider(null);

  const result2 = await loader.fetchAccessTokens(db, [33], []);

  expect(Array.from(result2.values())).toEqual([
    {
      kind: TokenResultType.SUCCESS,
      characterId: 33,
      token: "accessToken_rt33_2",
    },
  ]);

  await loader.fetchAccessTokens(db, [33], []);

  expect(loaderConfig.refreshCounts.get("rt33")).toBe(2);
});

test("Tokens requests that return 400 are marked as needsUpdate", async () => {
  loaderConfig.setRefreshProvider((refreshToken) => {
    if (refreshToken == "rt33") {
      throw axiosResponseError(400);
    }
    return null;
  });

  const result = await loader.fetchAccessTokens(db, [21, 33], ["scopeB"]);

  expect(result.get(33)).toEqual({
    kind: TokenResultType.TOKEN_INVALID,
    characterId: 33,
  });

  await loader.waitForDbCommit();

  expect(dbRow(33)).toEqual(
    expect.objectContaining({
      accessToken_needsUpdate: true,
      accessToken_refreshToken: "rt33",
      accessToken_accessToken: "accessToken_rt33_0",
    }),
  );
});

test("Transport-failed requests are re-requested", async () => {
  const transportError = axiosRequestError();
  loaderConfig.setRefreshProvider((refreshToken) => {
    if (refreshToken == "rt33") {
      throw transportError;
    }
    return null;
  });

  const result1 = await loader.fetchAccessTokens(db, [21, 33], []);
  const result2 = await loader.fetchAccessTokens(db, [33], []);
  const result3 = await loader.fetchAccessTokens(db, [33, 42], []);

  const errorResult = {
    kind: TokenResultType.HTTP_FAILURE,
    characterId: 33,
    error: transportError,
  };

  expect(result1.get(33)).toEqual(errorResult);
  expect(result2.get(33)).toEqual(errorResult);
  expect(result3.get(33)).toEqual(errorResult);

  expect(loaderConfig.refreshCounts.get("rt33")).toBe(3);
});

test("needsUpdate tokens are NOT re-requested", async () => {
  const axiosError = axiosResponseError(400);
  loaderConfig.setRefreshProvider((refreshToken) => {
    if (refreshToken == "rt33") {
      throw axiosError;
    }
    return null;
  });

  const result1 = await loader.fetchAccessTokens(db, [21, 33], []);
  const result2 = await loader.fetchAccessTokens(db, [21, 33], []);
  const result3 = await loader.fetchAccessTokens(db, [33, 42], []);

  const errorResult = {
    kind: TokenResultType.TOKEN_INVALID,
    characterId: 33,
  };

  expect(result1.get(33)).toEqual(errorResult);
  expect(result2.get(33)).toEqual(errorResult);
  expect(result3.get(33)).toEqual(errorResult);

  expect(loaderConfig.refreshCounts.get("rt33")).toBe(1);
});

test("needsUpdate tokens loaded directly from the DB are NOT re-requested", async () => {
  // Character 77 has needsUpdate=true set in its DB row

  const result1 = await loader.fetchAccessTokens(db, [33, 77], []);
  const result2 = await loader.fetchAccessTokens(db, [77], []);
  const result3 = await loader.fetchAccessTokens(db, [77, 42], []);
  await loader.waitForDbCommit();

  const errorResult = {
    kind: TokenResultType.TOKEN_INVALID,
    characterId: 77,
  };

  expect(loaderConfig.refreshCounts.get("rt77")).toBe(undefined);

  expect(result1.get(77)).toEqual(errorResult);
  expect(result2.get(77)).toEqual(errorResult);
  expect(result3.get(77)).toEqual(errorResult);

  expect(fakeDao.accessToken.calls.updateAll.callCount).toBe(1);
  expect(fakeDao.accessToken.calls.updateAll.updates.get(77)).toBe(undefined);
});

test("Updated refresh tokens are used", async () => {
  loaderConfig.setJwtExpiresIn(0);
  loaderConfig.setRefreshProvider((refreshToken) => {
    return {
      access_token: `accessToken_${refreshToken}_?`,
      refresh_token: refreshToken + "+",
      expires_in: -1,
    };
  });

  await loader.fetchAccessTokens(db, [21], []);
  await loader.fetchAccessTokens(db, [21], []);
  await loader.fetchAccessTokens(db, [21], []);
  await loader.fetchAccessTokens(db, [21], []);
  await loader.waitForDbCommit();

  expect(loaderConfig.refreshCounts.get("rt21")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt21+")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt21++")).toBe(1);
  expect(loaderConfig.refreshCounts.get("rt21+++")).toBe(1);

  expect(dbRow(21)).toEqual(
    expect.objectContaining({
      accessToken_refreshToken: "rt21++++",
    }),
  );
});

test("Manual refresh causes existing DB load to be aborted", async () => {
  const promise = loader.fetchAccessTokens(db, [21], []);
  await loader.storeRefreshToken(
    db,
    21,
    "rt21_updated",
    ["scopeD"],
    "accessToken_rt21_updated",
    20000,
    false,
  );
  const result = await promise;
  await loader.waitForDbCommit();

  expect(tokenResult(result, 21)).toBe("accessToken_rt21_updated");
  expect(loaderConfig.refreshCounts.get("rt21")).toBe(undefined);

  expect(dbRow(21)).toEqual({
    accessToken_character: 21,
    accessToken_refreshToken: "rt21_updated",
    accessToken_scopes: ["scopeD"],
    accessToken_accessToken: "accessToken_rt21_updated",
    accessToken_accessTokenExpires: 20000,
    accessToken_needsUpdate: false,
  });
  expect(fakeDao.accessToken.calls.updateAll.updates.get(21)).toBe(undefined);
});

test("Manual refresh causes existing refresh to be aborted", async () => {
  // First load a refreshed version of the token into the cache
  await loader.fetchAccessTokens(db, [21], []);
  // Now advance time so the token needs to be refreshed (but not loaded)
  fakeClock.setNow(20000);
  // Kick off a fetch that will cause a refresh request
  const fetchPromise = loader.fetchAccessTokens(db, [21], []);
  // Before the request can complete, update the cache entry
  const updatePromise = loader.storeRefreshToken(
    db,
    21,
    "rt21_updated",
    ["scopeD"],
    "accessToken_rt21_updated",
    171717,
    false,
  );
  // Finally, wait for the refresh request to complete
  const result = await fetchPromise;

  expect(tokenResult(result, 21)).toBe("accessToken_rt21_updated");
  expect(loaderConfig.refreshCounts.get("rt21")).toBe(2);

  // Wait for all pending DB actions to complete
  await updatePromise;
  await loader.waitForDbCommit();

  expect(dbRow(21)).toEqual({
    accessToken_character: 21,
    accessToken_refreshToken: "rt21_updated",
    accessToken_scopes: ["scopeD"],
    accessToken_accessToken: "accessToken_rt21_updated",
    accessToken_accessTokenExpires: 171717,
    accessToken_needsUpdate: false,
  });
});

test("Manual refresh cases existing DB write to be aborted", async () => {
  // Load and refresh the token, but queue the DB write
  await loader.fetchAccessTokens(db, [21], []);
  // Before the DB write occurs, update the access token
  loader.storeRefreshToken(
    db,
    21,
    "rt21_updated",
    ["scopeD"],
    "accessToken_rt21_updated",
    20000,
    false,
  );
  // Finally, wait for the DB write to take place
  await loader.waitForDbCommit();

  expect(dbRow(21)).toEqual({
    accessToken_character: 21,
    accessToken_refreshToken: "rt21_updated",
    accessToken_scopes: ["scopeD"],
    accessToken_accessToken: "accessToken_rt21_updated",
    accessToken_accessTokenExpires: 20000,
    accessToken_needsUpdate: false,
  });
});

test("Manual refresh doesn't cancel sibling refreshes", async () => {
  const promise = loader.fetchAccessTokens(db, [21, 33, 47], []);
  loader.storeRefreshToken(
    db,
    21,
    "rt21_updated",
    ["scopeD"],
    "accessToken_rt21_updated",
    20000,
    false,
  );
  const result = await promise;

  expect(tokenResult(result, 21)).toBe("accessToken_rt21_updated");
  expect(tokenResult(result, 33)).toBe("accessToken_rt33_1");
  expect(tokenResult(result, 47)).toBe("accessToken_rt47_1");
});

function tokenRow(
  row: Pick<AccessToken, "accessToken_character"> & Partial<AccessToken>,
) {
  const defaultRow: AccessToken = {
    accessToken_character: row.accessToken_character,
    accessToken_refreshToken: `rt${row.accessToken_character}`,
    accessToken_accessToken: `accessToken_rt${row.accessToken_character}_0`,
    accessToken_accessTokenExpires: 0,
    accessToken_needsUpdate: false,
    accessToken_scopes: [],
  };
  return Object.assign(defaultRow, row);
}

function buildDefaultRows() {
  return [
    tokenRow({
      accessToken_character: 21,
      accessToken_scopes: ["scopeA", "scopeB", "scopeC"],
    }),
    tokenRow({
      accessToken_character: 33,
      accessToken_scopes: ["scopeB", "scopeC"],
    }),
    tokenRow({
      accessToken_character: 42,
      accessToken_scopes: ["scopeA", "scopeC"],
    }),
    tokenRow({
      accessToken_character: 47,
      accessToken_scopes: ["scopeB"],
    }),
    tokenRow({
      accessToken_character: 55,
      accessToken_accessTokenExpires: 5000,
    }),
    tokenRow({
      accessToken_character: 66,
      accessToken_accessTokenExpires: 6000,
    }),
    tokenRow({
      accessToken_character: 77,
      accessToken_needsUpdate: true,
    }),
  ];
}

function tokenResult(
  resultMap: Map<number, AccessTokenResult>,
  characterId: number,
) {
  const result = resultMap.get(characterId);
  if (result?.kind == TokenResultType.SUCCESS) {
    return result.token;
  } else {
    return result?.kind;
  }
}

function dbRow(characterId: number) {
  return db.tables.accessToken.requireRow("accessToken_character", characterId);
}

function buildDefaultConfig() {
  let jwtExpiresIn: number | null = null;
  let refreshExpiresIn: number | null = 1000;
  let refreshProvider:
    | ((refreshToken: string) => SsoTokenRefreshResponse | null)
    | null;
  const refreshCounts = new Map<string, number>();

  return {
    get refreshCounts() {
      return refreshCounts;
    },

    minTokenLifetime: 1000,
    dbFlushFrequency: 0,
    fetchers: {
      async fetchJwtInfo(_accessToken: string) {
        return {
          name: "fetchAuthInfo_name",
          owner: "fetchAuthInfo_owner",
          scp: [],
          exp: jwtExpiresIn ?? Math.floor(fakeClock.now() / 1000) + 10,
        };
      },

      async fetchRefreshInfo(ssoAuthCode: string, refreshToken: string) {
        const refreshCount = (refreshCounts.get(refreshToken) ?? 0) + 1;
        refreshCounts.set(refreshToken, refreshCount);

        return (
          refreshProvider?.(refreshToken) ?? {
            access_token: `accessToken_${refreshToken}_${refreshCount}`,
            refresh_token: refreshToken,
            expires_in: refreshExpiresIn ?? -1,
          }
        );
      },
    },

    setJwtExpiresIn(value: number) {
      jwtExpiresIn = value;
    },

    setRefreshExpiresIn(value: number) {
      refreshExpiresIn = value;
    },

    setRefreshProvider(
      provider:
        | ((refreshToken: string) => SsoTokenRefreshResponse | null)
        | null,
    ) {
      refreshProvider = provider;
    },
  };
}

function axiosResponseError(status: number, message = "fake_message") {
  const headers = new AxiosHeaders();
  const config = {
    url: "fake_url",
    headers,
  };
  const request = {};
  return new AxiosError(message, "E_FAKE", config, request, {
    status,
    config,
    headers,
    statusText: "fake_status_text",
    data: null,
  });
}

function axiosRequestError(message = "fake_message") {
  const headers = new AxiosHeaders();
  const config = {
    url: "fake_url",
    headers,
  };
  const request = {};

  return new AxiosError(message, "E_FAKE", config, request);
}

interface SsoTokenRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}
