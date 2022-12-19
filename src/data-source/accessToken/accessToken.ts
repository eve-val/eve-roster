import { dao } from "../../db/dao.js";
import { Tnex } from "../../db/tnex/index.js";
import { AccessToken } from "../../db/tables.js";
import {
  AccessTokenError,
  AccessTokenErrorType,
} from "../../error/AccessTokenError.js";
import {
  RefreshResult,
  TokenRefresher,
  AccessTokenUpdate,
} from "./TokenRefresher.js";
import { getEnvLegacy } from "../../infra/init/Env.js";

const TOKEN_EXPIRATION_FUDGE_MS = 1000; // 1 second
const tokenRefresher = new TokenRefresher(
  getEnvLegacy().SSO_CLIENT_ID,
  getEnvLegacy().SSO_SECRET_KEY
);

/**
 * Retrieves an access token for a character. Throws an AccessTokenError if
 * (a) there is no token on file for that character, (b) ESI rejected our
 * request to refresh the token, or (c) we experienced generic HTTP failure
 * when trying to refresh the token.
 */
export async function getAccessToken(db: Tnex, characterId: number) {
  const row = await dao.accessToken.getForCharacter(db, characterId);
  if (row == null) {
    throw new AccessTokenError(characterId, AccessTokenErrorType.TOKEN_MISSING);
  }

  let token: string;
  if (!tokenHasExpired(row)) {
    token = row.accessToken_accessToken;
  } else {
    const result = await tokenRefresher.refreshAccessToken(row);
    if (result.row != null) {
      token = result.row.accessToken_accessToken;
      await dao.accessToken.updateForCharacter(db, characterId, result.row);
    } else {
      throw new AccessTokenError(characterId, result.errorType!);
    }
  }

  return token;
}

/**
 * Retrieve more than one token at a time. Use this whenever possible as it is
 * optimized to perform only two DB operations per call.
 *
 * Unlike {@link #getAccessToken()}, doesn't throw errors. Instead, returns a
 * map of {@link #TokenResult}.
 *
 * The map is guaranteed to have an entry for every character ID passed to it.
 */
export async function getAccessTokens(db: Tnex, characterIds: number[]) {
  const rows = await dao.accessToken.getAll(db, characterIds);
  return getAccessTokensFromRows(db, rows);
}

export async function getAccessTokensFromRows(
  db: Tnex,
  rows: AccessTokenRowSub[]
) {
  const tokenMap = new Map<number, TokenResult>();
  const refreshRequests: Promise<RefreshResult>[] = [];

  for (const row of rows) {
    if (!tokenHasExpired(row)) {
      tokenMap.set(row.accessToken_character, {
        kind: "success",
        token: row.accessToken_accessToken,
      });
    } else {
      refreshRequests.push(tokenRefresher.refreshAccessToken(row));
    }
  }

  const refreshedTokens = await Promise.all(refreshRequests);
  const rowUpdates: AccessTokenUpdate[] = [];
  for (const refreshResult of refreshedTokens) {
    let result: TokenResult;
    if (refreshResult.row != null) {
      result = {
        kind: "success",
        token: refreshResult.row.accessToken_accessToken,
      };
    } else {
      result = {
        kind: "error",
        error: refreshResult.errorType!,
      };
    }
    tokenMap.set(refreshResult.characterId, result);

    if (refreshResult.isOriginalRequest && refreshResult.row != null) {
      rowUpdates.push(refreshResult.row);
    }
  }
  if (rowUpdates.length > 0) {
    await dao.accessToken.updateAll(db, rowUpdates);
  }

  for (const row of rows) {
    if (!tokenMap.has(row.accessToken_character)) {
      tokenMap.set(row.accessToken_character, {
        kind: "error",
        error: AccessTokenErrorType.TOKEN_MISSING,
      });
    }
  }

  return tokenMap;
}

export type AccessTokenRowSub = Pick<
  AccessToken,
  | "accessToken_character"
  | "accessToken_accessToken"
  | "accessToken_accessTokenExpires"
  | "accessToken_refreshToken"
>;

export type TokenResult = SuccessResult | ErrorResult;

export interface SuccessResult {
  kind: "success";
  token: string;
}

export interface ErrorResult {
  kind: "error";
  error: AccessTokenErrorType;
}

function tokenHasExpired(
  row: Pick<AccessToken, "accessToken_accessTokenExpires">
) {
  return (
    Date.now() > row.accessToken_accessTokenExpires - TOKEN_EXPIRATION_FUDGE_MS
  );
}
