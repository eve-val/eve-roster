import * as querystring from "querystring";
import axios from "axios";
import * as jose from "jose";
import { AccessToken } from "../../db/tables.js";
import { Env } from "../../infra/init/Env.js";
import { fetchJwtInfo } from "./jwt.js";
import { generateSsoAuthToken } from "./generateSsoAuthCode.js";
import { Resolvable } from "../../util/async/Resolvable.js";
import { Tnex } from "../../db/tnex/Tnex.js";
import { dao } from "../../db/dao.js";
import { buildLogger } from "../../infra/logging/buildLogger.js";
import { clock } from "../../util/wrapped/clock.js";
import { checkNotNil } from "../../../shared/util/assert.js";
import { ScopeSetCache } from "./ScopeSetCache.js";
import {
  AccessTokenErrorResult,
  AccessTokenResult,
  TokenResultType,
} from "./AccessTokenResult.js";
import { errorMessage } from "../../util/error.js";

const logger = buildLogger("AccessTokenLoader");

/**
 * Centralized loader and refresher for access tokens
 *
 * Manages an in-memory cache of access tokens and refreshes them when needed.
 * Coalesces DB reads and loads to increase performance.
 */
export class AccessTokenLoader {
  private dbWriter: BatchedDbWriter;
  private scopeCache = new ScopeSetCache();

  private ssoAuthCode: string;
  private cache = new Map<number, CacheEntry>();

  private scheduledDbLoads: {
    actionId: number;
    characterIds: number[];
  } | null = null;
  private nextActionId = 0;

  constructor(
    env: Env,
    private config = {
      minTokenLifetime: 30000,
      dbFlushFrequency: 60000,
      fetchers: {
        fetchRefreshInfo,
        fetchJwtInfo,
      },
    },
  ) {
    this.dbWriter = new BatchedDbWriter(config.dbFlushFrequency);

    this.ssoAuthCode = generateSsoAuthToken(
      env.SSO_CLIENT_ID,
      env.SSO_SECRET_KEY,
    );
  }

  /**
   * Retrieves access tokens for one or more characters.
   *
   * All returned tokens as guaranteed to be valid for
   * {@link #minTokenLifetime}, in milliseconds.
   *
   * This function does not normally throw errors. Instead, it returns a map of
   * {@link TokenResult}.
   *
   * @param characterIds The characters to retrieve access tokens for.
   * @param requiredScopes Any access token that is missing one or more required
   *   scopes will be returned with {@link AccessTokenErrorType.MISSING_SCOPES}.
   * @returns A Map<string, TokenResult> with entries for every characterId.
   */
  async fetchAccessTokens(
    db: Tnex,
    characterIds: number[],
    requiredScopes: string[],
  ): Promise<Map<number, AccessTokenResult>> {
    const promises: Promise<ProcessedCacheEntryResult>[] = [];

    for (const id of characterIds) {
      const cacheEntry = this.cache.get(id);
      if (cacheEntry == null) {
        const newEntry: UnloadedCacheEntry = {
          characterId: id,
          type: "unloaded",
          resolvable: new Resolvable<ProcessedCacheEntryResult>(),
          actionId: this.generateActionId(),
        };
        this.cache.set(id, newEntry);
        this.scheduleForLoad(db, newEntry);
        promises.push(newEntry.resolvable.promise);
      } else if (cacheEntry.type == "unloaded") {
        promises.push(cacheEntry.resolvable.promise);
      } else if (cacheEntry.resolvable != null) {
        promises.push(cacheEntry.resolvable.promise);
      } else {
        promises.push(this.handleLoadedCacheItem(db, cacheEntry));
      }
    }

    const results = await Promise.all(promises);

    const finalMap = new Map<number, AccessTokenResult>();
    for (const result of results) {
      let finalResult: AccessTokenResult;

      if (result.kind == "process_entry_success") {
        const missingScopes = getMissingScopes(result.entry, requiredScopes);

        if (missingScopes.length == 0) {
          finalResult = {
            kind: TokenResultType.SUCCESS,
            characterId: result.characterId,
            token: result.entry.accessToken,
          };
        } else {
          finalResult = {
            kind: TokenResultType.MISSING_SCOPES,
            characterId: result.characterId,
            missingScopes,
          };
        }
      } else {
        finalResult = result;
      }
      finalMap.set(result.characterId, finalResult);
    }

    return finalMap;
  }

  /**
   * Stores a newly-retrieved refresh token (and associated scopes etc) in the
   * DB. This token is usually obtained immediately after a user authenticates
   * via EVE SSO.
   */
  async storeRefreshToken(
    db: Tnex,
    characterId: number,
    refreshToken: string,
    scopes: string[],
    accessTokenVal: string,
    accessTokenExpires: number,
    needsUpdate: boolean,
  ) {
    logger.info(
      `Access token for character ${characterId}` + ` manually refreshed.`,
    );

    const existingCacheEntry = this.cache.get(characterId);
    const resolvable = existingCacheEntry?.resolvable;
    const newCacheEntry = this.buildLoadedCacheEntry(
      characterId,
      refreshToken,
      scopes,
      accessTokenVal,
      accessTokenExpires,
      false,
    );
    newCacheEntry.actionId = this.generateActionId();
    if (existingCacheEntry?.type == "loaded") {
      Object.assign(existingCacheEntry, newCacheEntry);
    } else {
      this.cache.set(characterId, newCacheEntry);
    }

    resolvable?.resolve({
      kind: "process_entry_success",
      characterId: newCacheEntry.characterId,
      entry: newCacheEntry,
    });

    await this.dbWriter.writeRowImmediate(
      db,
      characterId,
      refreshToken,
      scopes,
      accessTokenVal,
      accessTokenExpires,
      needsUpdate,
    );
  }

  /**
   * Returns a Promise that will be fulfilled as soon as any pending writes to
   * the DB are committed. If there are no writes pending, the Promise will be
   * immediately fulfilled.
   *
   * @VisibleForTest
   */
  waitForDbCommit(): Promise<void> {
    return this.dbWriter.waitForDbCommit();
  }

  private scheduleForLoad(db: Tnex, entry: UnloadedCacheEntry) {
    if (this.scheduledDbLoads == null) {
      this.scheduledDbLoads = {
        actionId: this.generateActionId(),
        characterIds: [],
      };
      queueMicrotask(() => {
        this.processPendingDbLoads(db);
      });
    }
    entry.actionId = this.scheduledDbLoads.actionId;
    this.scheduledDbLoads.characterIds.push(entry.characterId);
  }

  private async processPendingDbLoads(db: Tnex) {
    const task = checkNotNil(this.scheduledDbLoads);
    this.scheduledDbLoads = null;

    const rows = await dao.accessToken.getAll(db, task.characterIds);
    for (const row of rows) {
      const entry = this.cache.get(row.accessToken_character);
      if (entry != null && entry.actionId != task.actionId) {
        logger.info(
          `Aborting DB load for character ${entry.characterId}:` +
            ` token was manually refreshed recently`,
        );
        continue;
      }
      if (entry == null || entry.type == "loaded") {
        throw new Error(
          `Expected cache entry for ` +
            `${row.accessToken_character} to be unloaded`,
        );
      }
      logger.info(
        `Loaded access tokens for character ${entry.characterId} from DB.`,
      );

      const cacheEntry = this.buildLoadedCacheEntry(
        row.accessToken_character,
        row.accessToken_refreshToken,
        row.accessToken_scopes,
        row.accessToken_accessToken,
        row.accessToken_accessTokenExpires,
        row.accessToken_needsUpdate,
      );
      cacheEntry.resolvable = entry.resolvable;
      this.cache.set(cacheEntry.characterId, cacheEntry);

      this.handleLoadedCacheItem(db, cacheEntry);
    }
  }

  private async handleLoadedCacheItem(
    db: Tnex,
    entry: LoadedCacheEntry,
  ): Promise<ProcessedCacheEntryResult> {
    if (entry.refreshStatus == "refreshing") {
      throw new Error(`Already processing cache item for ${entry.characterId}`);
    }

    let result: ProcessedCacheEntryResult;

    if (entry.tokenStatus == "invalid") {
      result = {
        kind: TokenResultType.TOKEN_INVALID,
        characterId: entry.characterId,
      };
    } else if (tokenHasExpired(entry, this.config.minTokenLifetime)) {
      result = await this.handleExpiredToken(db, entry);
    } else {
      result = {
        kind: "process_entry_success",
        characterId: entry.characterId,
        entry,
      };
    }

    entry.resolvable?.resolve(result);
    entry.resolvable = null;

    return result;
  }

  private async handleExpiredToken(db: Tnex, entry: LoadedCacheEntry) {
    logger.info(`Refreshing token for character ${entry.characterId}...`);

    let result: ProcessedCacheEntryResult;

    if (entry.resolvable == null) {
      entry.resolvable = new Resolvable<ProcessedCacheEntryResult>();
    }
    const actionId = this.generateActionId();
    entry.actionId = actionId;
    entry.refreshStatus = "refreshing";
    const refreshResult = await this.fetchRefreshToken(
      entry.characterId,
      entry.refreshToken,
    );
    if (entry.actionId != actionId) {
      // This can occur if someone called [updateCacheItem] while we were
      // refreshing the token
      logger.info(
        `Aborting refresh request for character ` +
          `${entry.characterId}; token was manually refreshed recently.`,
      );
      result = {
        kind: "process_entry_success",
        characterId: entry.characterId,
        entry,
      };
    } else if (entry.refreshStatus != "refreshing") {
      throw new Error(
        `Expected status for ${entry.characterId} to be "refreshing"`,
      );
    } else if (refreshResult.kind == "refresh_success") {
      const expiresIn = (
        (refreshResult.expires - clock.now()) /
        1000 /
        60
      ).toFixed(1);
      logger.info(
        `Successfully refreshed token for character` +
          ` ${entry.characterId}; expires ${refreshResult.expires}` +
          ` (in ${expiresIn} minutes)`,
      );
      entry.accessToken = refreshResult.token;
      entry.accessTokenExpires = refreshResult.expires;
      entry.refreshToken = refreshResult.refreshToken;
      result = {
        kind: "process_entry_success",
        characterId: entry.characterId,
        entry,
      };
    } else {
      if (refreshResult.kind == TokenResultType.TOKEN_INVALID) {
        entry.tokenStatus = "invalid";
      }
      logger.info(
        `Failed to refresh token for character ${entry.characterId}: ` +
          `${TokenResultType[refreshResult.kind]}`,
      );
      result = refreshResult;
    }
    entry.refreshStatus = "inactive";

    this.dbWriter.writeEntry(db, entry);

    return result;
  }

  private async fetchRefreshToken(
    characterId: number,
    refreshToken: string,
  ): Promise<RefreshResult> {
    let refreshResponse: SsoTokenRefreshResponse;
    let jwtResponse: Awaited<ReturnType<typeof fetchJwtInfo>>;
    try {
      refreshResponse = await this.config.fetchers.fetchRefreshInfo(
        this.ssoAuthCode,
        refreshToken,
      );
    } catch (e) {
      if (axios.isAxiosError(e)) {
        logger.warn(
          `Transport error while refreshing token for character` +
            `${characterId}. Status=${e.response?.status} JSON=${e.toJSON()}`,
        );
        if (e.response && [400, 401, 403].includes(e.response.status)) {
          logger.error(`Token rejection for character ${characterId}`);
          return {
            kind: TokenResultType.TOKEN_INVALID,
            characterId,
          };
        } else {
          return {
            kind: TokenResultType.HTTP_FAILURE,
            characterId,
            error: e,
          };
        }
      } else {
        logger.error(
          `Unknown error while refreshing token for character ` +
            `${characterId}: ${errorMessage(e)}`,
        );
        return {
          kind: TokenResultType.UNKNOWN_ERROR,
          characterId,
          error: e,
        };
      }
    }

    try {
      jwtResponse = await this.config.fetchers.fetchJwtInfo(
        refreshResponse.access_token,
      );
    } catch (e) {
      if (e instanceof jose.errors.JOSEError) {
        logger.info(
          `JWT error while refreshing token for character ` +
            `${characterId}: ${e.name} ${e.code} ${e.message}`,
        );
        return {
          kind: TokenResultType.JWT_ERROR,
          characterId,
          error: e,
        };
      } else {
        logger.error(
          `Unknown error while refreshing token for character ` +
            `${characterId}: ${errorMessage(e)}`,
        );
        return {
          kind: TokenResultType.UNKNOWN_ERROR,
          characterId,
          error: e,
        };
      }
    }

    return {
      kind: "refresh_success",
      characterId,
      token: refreshResponse.access_token,
      refreshToken: refreshResponse.refresh_token,
      expires: (jwtResponse.exp ?? 0) * 1000,
    };
  }

  private buildLoadedCacheEntry(
    characterId: number,
    refreshToken: string,
    scopes: string[],
    accessToken: string,
    accessTokenExpires: number,
    needsUpdate: boolean,
  ): LoadedCacheEntry {
    return {
      characterId,
      type: "loaded",
      refreshStatus: "inactive",
      resolvable: null,
      actionId: 0,
      refreshToken,
      tokenStatus: needsUpdate ? "invalid" : "ok",
      accessToken,
      accessTokenExpires,
      scopes: this.scopeCache.getScopeSet(scopes),
    };
  }

  private generateActionId(): number {
    const actionId = this.nextActionId;
    this.nextActionId++;
    return actionId;
  }
}

function fetchRefreshInfo(ssoAuthCode: string, refreshToken: string) {
  return axios
    .post<SsoTokenRefreshResponse>(
      "https://login.eveonline.com/v2/oauth/token",
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: "Basic " + ssoAuthCode,
        },
        timeout: 10000,
      },
    )
    .then((response) => {
      return response.data;
    });
}

interface SsoTokenRefreshResponse {
  access_token: string;
  expires_in: number;
  refresh_token: string;
}

class BatchedDbWriter {
  constructor(
    private dbUpdateFrequency: number,
    private maxWrites = 1000,
  ) {}

  private db!: Tnex;
  private onDbCommitted: Resolvable<void> | null = null;

  private pendingWrites = new Map<
    number,
    Pick<
      AccessToken,
      | "accessToken_character"
      | "accessToken_refreshToken"
      | "accessToken_accessToken"
      | "accessToken_accessTokenExpires"
      | "accessToken_needsUpdate"
    >
  >();

  private pendingTimeout: NodeJS.Timeout | null = null;

  waitForDbCommit() {
    return this.onDbCommitted?.promise ?? Promise.resolve();
  }

  writeEntry(db: Tnex, entry: LoadedCacheEntry) {
    this.db = db;
    this.pendingWrites.set(entry.characterId, {
      accessToken_character: entry.characterId,
      accessToken_refreshToken: entry.refreshToken,
      accessToken_accessToken: entry.accessToken,
      accessToken_accessTokenExpires: entry.accessTokenExpires,
      accessToken_needsUpdate: entry.tokenStatus == "invalid",
    });
    this.maybeScheduleWrite();
  }

  async writeRowImmediate(
    db: Tnex,
    characterId: number,
    refreshToken: string,
    scopes: string[],
    accessToken: string,
    accessTokenExpires: number,
    needsUpdate: boolean,
  ) {
    this.pendingWrites.delete(characterId);
    await dao.accessToken.upsert(
      db,
      characterId,
      refreshToken,
      scopes,
      accessToken,
      accessTokenExpires,
      needsUpdate,
    );
  }

  private maybeScheduleWrite() {
    if (this.pendingWrites.size >= this.maxWrites) {
      logger.warn(
        `Performing early DB write because we have ` +
          `${this.pendingWrites.size} pending writes...`,
      );
      if (this.pendingTimeout != null) {
        clearTimeout(this.pendingTimeout);
        this.pendingTimeout = null;
      }
      this.writePendingRows();
      checkNotNil(this.onDbCommitted).resolve();
      this.onDbCommitted = null;
    } else if (this.pendingTimeout == null) {
      this.onDbCommitted = new Resolvable<void>();
      this.pendingTimeout = setTimeout(() => {
        this.pendingTimeout = null;
        this.writePendingRows();
        checkNotNil(this.onDbCommitted).resolve();
        this.onDbCommitted = null;
      }, this.dbUpdateFrequency);
    }
  }

  private async writePendingRows() {
    logger.info(
      `Writing ${this.pendingWrites.size} token updates to the DB...`,
    );

    const rows = Array.from(this.pendingWrites.values());
    this.pendingWrites.clear();

    if (rows.length > 0) {
      await dao.accessToken.updateAll(this.db, rows).catch((err) => {
        logger.error(`Error while trying to write token rows to DB`, err);
        throw err;
      });
    }
  }
}

type CacheEntry = UnloadedCacheEntry | LoadedCacheEntry;

interface UnloadedCacheEntry {
  characterId: number;
  type: "unloaded";
  resolvable: Resolvable<ProcessedCacheEntryResult>;
  actionId: number;
}

interface LoadedCacheEntry {
  characterId: number;
  type: "loaded";
  refreshStatus: "inactive" | "refreshing";
  resolvable: Resolvable<ProcessedCacheEntryResult> | null;
  actionId: number;
  refreshToken: string;
  scopes: Set<string>;
  tokenStatus: "ok" | "invalid";
  accessToken: string;
  accessTokenExpires: number;
}

type ProcessedCacheEntryResult =
  | {
      kind: "process_entry_success";
      characterId: number;
      entry: LoadedCacheEntry;
    }
  | AccessTokenErrorResult;

type RefreshResult =
  | {
      kind: "refresh_success";
      characterId: number;
      token: string;
      expires: number;
      refreshToken: string;
    }
  | AccessTokenErrorResult;

function getMissingScopes(
  cacheEntry: LoadedCacheEntry,
  requiredScopes: string[],
) {
  const missingScopes: string[] = [];
  for (const scope of requiredScopes) {
    if (!cacheEntry.scopes.has(scope)) {
      missingScopes.push(scope);
    }
  }
  return missingScopes;
}

function tokenHasExpired(
  cacheEntry: LoadedCacheEntry,
  minTokenLifetime: number,
) {
  return clock.now() > cacheEntry.accessTokenExpires - minTokenLifetime;
}
