import { ESIError, ErrorName, isESIError } from 'eve-swagger';
import { EsiErrorCompat } from '../eve/esi/EsiErrorCompat';
import { EsiError, EsiErrorKind } from '../eve/esi/EsiError';

export function isAnyEsiError(error: any): error is EsiError {
  return error instanceof ESIError || error instanceof EsiErrorCompat;
}

export function isEsiNotFoundError(error: any): error is EsiError {
  return isAnyEsiError(error) && error.kind == EsiErrorKind.NOT_FOUND_ERROR;
}

export function isMissingCharError(error: any): error is EsiError {
  return isAnyEsiError(error)
      && (error.kind == EsiErrorKind.NOT_FOUND_ERROR
          || (error.info.response != undefined
              && error.info.response.status == 410));
}
