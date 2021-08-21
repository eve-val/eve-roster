import * as querystring from "querystring";
import axios from "axios";

import { AccessToken } from "../../db/tables";
import { AccessTokenErrorType } from "../../error/AccessTokenError";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../../infra/logging/buildLogger";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

/**
 * Class for refreshing access tokens. Given a refresh token, returns a
 * new access token.
 */
export class TokenRefresher {
  private _activeRequests = new Map<number, Promise<RefreshResult>>();

  /**
   * Asks CCP for a new access token for this character. If the request
   * succeeds, an updated DB row is returned. It's up to the caller to commit
   * this row to the DB.
   *
   * Multiple calls to this method for the same character will be coalesced
   * into a single refresh request. Callers should check the `isOriginalRequest`
   * field to determine whether they need to commit the result row to the DB.
   */
  public refreshAccessToken(row: RowToRefresh) {
    let request = this._activeRequests.get(row.accessToken_character);
    if (request == undefined) {
      request = this._refreshAccessToken(row).then((result) => {
        this._activeRequests.delete(row.accessToken_character);
        return result;
      });
      this._activeRequests.set(row.accessToken_character, request);
    } else {
      request = request.then((row) => {
        const copy = Object.assign({}, row);
        copy.isOriginalRequest = false;
        return copy;
      });
    }
    return request;
  }

  private async _refreshAccessToken(row: RowToRefresh): Promise<RefreshResult> {
    const result: RefreshResult = {
      characterId: row.accessToken_character,
      isOriginalRequest: true,
      row: null,
      errorType: null,
    };

    try {
      const response = await this._postRefreshRequest(
        row.accessToken_refreshToken
      );

      result.row = {
        accessToken_character: row.accessToken_character,
        accessToken_accessToken: response.data.access_token,
        accessToken_accessTokenExpires:
          Date.now() + 1000 * response.data.expires_in,
        accessToken_needsUpdate: false,
      };
    } catch (e) {
      if (e.response) {
        if (e.response.status == 400) {
          logger.info(
            `Access token refresh request was rejected for char ` +
              `${row.accessToken_character}.`
          );
          result.errorType = AccessTokenErrorType.TOKEN_REFRESH_REJECTED;
          result.row = {
            accessToken_character: row.accessToken_character,
            accessToken_accessToken: "",
            accessToken_accessTokenExpires: 0,
            accessToken_needsUpdate: true,
          };
        } else {
          result.errorType = AccessTokenErrorType.HTTP_FAILURE;
          logger.error(
            `HTTP error while refreshing token for ` +
              `${row.accessToken_character}.`
          );
          logger.error(e);
        }
      } else {
        result.errorType = AccessTokenErrorType.HTTP_FAILURE;
        logger.error(
          `Generic error while refreshing token for ` +
            `${row.accessToken_character}.`
        );
        logger.error(e);
      }
    }

    return result;
  }

  private _postRefreshRequest(refreshToken: string) {
    return axios.post<SsoTokenRefreshResponse>(
      "https://login.eveonline.com/oauth/token",
      querystring.stringify({
        grant_type: "refresh_token",
        refresh_token: refreshToken,
      }),
      {
        headers: {
          Authorization: "Basic " + SSO_AUTH_CODE,
        },
        timeout: REQUEST_TIMEOUT,
      }
    );
  }
}

const SSO_AUTH_CODE = Buffer.from(
  process.env.SSO_CLIENT_ID + ":" + process.env.SSO_SECRET_KEY
).toString("base64");

const REQUEST_TIMEOUT = 10000;

interface SsoTokenRefreshResponse {
  access_token: string;
  expires_in: number;
}

export type RowToRefresh = Pick<
  AccessToken,
  "accessToken_character" | "accessToken_refreshToken"
>;

export interface RefreshResult {
  characterId: number;
  isOriginalRequest: boolean;
  row: AccessTokenUpdate | null;
  errorType: AccessTokenErrorType | null;
}

export type AccessTokenUpdate = Pick<
  AccessToken,
  | "accessToken_character"
  | "accessToken_accessToken"
  | "accessToken_accessTokenExpires"
  | "accessToken_needsUpdate"
>;
