import { ESIError } from 'eve-swagger';
import { EsiErrorCompat } from './EsiErrorCompat';
import { EsiError, EsiErrorKind } from './EsiError';
import { VError } from 'verror';
import { inspect } from 'util';

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

export function printError(e: any) {
  if (isAnyEsiError(e)) {
    return VError.fullStack(e);
  } else {
    return inspect(e);
  }
}
