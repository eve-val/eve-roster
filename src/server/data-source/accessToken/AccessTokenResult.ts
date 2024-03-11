import { isAxiosError } from "axios";
import { errorMessage } from "../../util/error.js";

export enum TokenResultType {
  SUCCESS,
  MISSING_SCOPES,
  TOKEN_MISSING,
  TOKEN_INVALID,
  HTTP_FAILURE,
  JWT_ERROR,
  UNKNOWN_ERROR,
}

export type AccessTokenResult = SuccessResult | AccessTokenErrorResult;

export type AccessTokenErrorResult =
  | SimpleErrorResult
  | MissingScopesResult
  | ThrownErrorResult;

interface SuccessResult extends BaseResult {
  kind: TokenResultType.SUCCESS;
  token: string;
}

interface MissingScopesResult extends BaseResult {
  kind: TokenResultType.MISSING_SCOPES;
  missingScopes: string[];
}

interface SimpleErrorResult extends BaseResult {
  kind: TokenResultType.TOKEN_MISSING | TokenResultType.TOKEN_INVALID;
}

interface ThrownErrorResult extends BaseResult {
  kind:
    | TokenResultType.HTTP_FAILURE
    | TokenResultType.JWT_ERROR
    | TokenResultType.UNKNOWN_ERROR;
  error: unknown;
}

interface BaseResult {
  characterId: number;
}

export function accessTokenResultToString(result: AccessTokenResult): string {
  let message: string;

  switch (result.kind) {
    case TokenResultType.SUCCESS:
      message = `token=${result.token}`;
      break;
    case TokenResultType.MISSING_SCOPES:
      message = `missingScopes=[${result.missingScopes.join(",")}]`;
      break;
    case TokenResultType.TOKEN_MISSING:
    case TokenResultType.TOKEN_INVALID:
      message = "";
      break;
    case TokenResultType.HTTP_FAILURE:
    case TokenResultType.JWT_ERROR:
    case TokenResultType.UNKNOWN_ERROR:
      if (isAxiosError(result.error)) {
        message =
          `message="${result.error.message}" ` +
          JSON.stringify(result.error.toJSON());
      } else {
        message = errorMessage(result.error);
      }
      break;
  }

  return (
    `(${TokenResultType[result.kind]} character=${result.characterId} ` +
    `${message})`
  );
}

export class AccessTokenError extends Error {
  constructor(public readonly result: AccessTokenErrorResult) {
    super(`AccessTokenError:` + accessTokenResultToString(result));
  }

  isInsufficientTokenError(): boolean {
    switch (this.result.kind) {
      case TokenResultType.MISSING_SCOPES:
      case TokenResultType.TOKEN_MISSING:
      case TokenResultType.TOKEN_INVALID:
        return true;
      case TokenResultType.HTTP_FAILURE:
      case TokenResultType.JWT_ERROR:
      case TokenResultType.UNKNOWN_ERROR:
        return false;
    }
  }
}
