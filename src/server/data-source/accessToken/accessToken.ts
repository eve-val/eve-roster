import { Tnex } from "../../db/tnex/index.js";
import { getEnv } from "../../infra/init/Env.js";
import { AccessTokenLoader } from "./AccessTokenLoader.js";
import { checkNotNil } from "../../../shared/util/assert.js";
import {
  AccessTokenError,
  AccessTokenResult,
  TokenResultType,
} from "./AccessTokenResult.js";
import { EsiScope } from "../esi/EsiScope.js";

const tokenLoader = new AccessTokenLoader(getEnv());

/**
 * Retrieves an access token for a character. Throws an AccessTokenError if
 * (a) there is no token on file for that character, (b) the token on file does
 * not have the specified scopes, (c) ESI rejected our request to refresh the
 * token, or (d) we experienced generic HTTP failure when trying to refresh the
 * token.
 */
export async function fetchAccessToken(
  db: Tnex,
  characterId: number,
  scopes: EsiScope[],
) {
  const map = await tokenLoader.fetchAccessTokens(db, [characterId], scopes);
  const result = checkNotNil(map.get(characterId));
  if (result.kind == TokenResultType.SUCCESS) {
    return result.token;
  } else {
    throw new AccessTokenError(result);
  }
}

export async function fetchAccessTokenResult(
  db: Tnex,
  characterId: number,
  scopes: EsiScope[],
): Promise<AccessTokenResult> {
  const map = await tokenLoader.fetchAccessTokens(db, [characterId], scopes);
  return checkNotNil(map.get(characterId));
}

/**
 * Retrieve more than one token at a time.
 *
 * Unlike {@link #getAccessToken()}, doesn't throw errors. Instead, returns a
 * map of {@link AccessTokenResult}.
 *
 * The map is guaranteed to have an entry for every character ID passed to it.
 */
export async function fetchAccessTokens(
  db: Tnex,
  characterIds: number[],
  scopes: EsiScope[],
) {
  return tokenLoader.fetchAccessTokens(db, characterIds, scopes);
}

export const AccessToken = {
  loader: tokenLoader,
  fetch: fetchAccessToken,
  fetchAll: fetchAccessTokens,
};
