import { ExtendableError } from './ExtendableError';

export const enum AccessTokenErrorType {
  TOKEN_MISSING,
  TOKEN_REFRESH_REJECTED,
}

export class AccessTokenError extends ExtendableError {
  constructor(
      public readonly characterId: number,
      public readonly type: AccessTokenErrorType,
      ) {
    super(getMessage(type, characterId));
  }
}

function getMessage(errorType: AccessTokenErrorType, characterId: number) {
  switch (errorType) {
    case AccessTokenErrorType.TOKEN_MISSING:
      return `Missing access token for character ${characterId}`;
    case AccessTokenErrorType.TOKEN_REFRESH_REJECTED:
      return `Access token refresh rejected for character ${characterId}.`;
  }
}
