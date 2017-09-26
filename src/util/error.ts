import {ESIError, ErrorName, isESIError} from 'eve-swagger';

export function isAnyEsiError(error: any) {
  return error instanceof Error && isESIError(error);
}

export function isEsiNotFoundError(error: any) {
  return error instanceof Error && isESIError(error, ErrorName.NOT_FOUND_ERROR);
}

export function isMissingCharError(error: any) {
  if (error instanceof Error && isESIError(error)) {
    if (error.kind === ErrorName.NOT_FOUND_ERROR) {
      return true;
    } else if (error.info.response && error.info.response.status == 410) {
      return true;
    }
  } else {
    return false;
  }
}
