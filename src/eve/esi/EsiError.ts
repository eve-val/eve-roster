import VError = require('verror');

/**
 * Generic interface version of the EsiError type exposed in the eve-swagger
 * library. Allows us to create our own EsiError implementation
 * (EsiErrorCompat).
 */
export interface EsiError extends VError {
  readonly kind: EsiErrorKind,
  readonly info: {
    response?: {
      status: number,
    }
  },
  readonly fullStack: string,
}

export enum EsiErrorKind {
  CLIENT_ERROR = "esi:ClientError",
  FORBIDDEN_ERROR = "esi:ForbiddenError",
  NOT_FOUND_ERROR = "esi:NotFoundError",
  INTERNAL_SERVER_ERROR = "esi:InternalServerError",
  IO_ERROR = "esi:IOError",
  GENERIC_ERROR = "esi:Error",
}
