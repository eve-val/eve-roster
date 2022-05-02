import { EsiError, EsiErrorKind } from "./EsiError.js";
import VError from "verror";
import { inspect } from "util";

export function isAnyEsiError(error: any): error is EsiError {
  return error instanceof EsiError;
}

export function isEsiNotFoundError(error: any): error is EsiError {
  return isAnyEsiError(error) && error.kind == EsiErrorKind.NOT_FOUND_ERROR;
}

export function isMissingCharError(error: any): error is EsiError {
  return (
    isAnyEsiError(error) &&
    (error.kind == EsiErrorKind.NOT_FOUND_ERROR ||
      (error.info.response != undefined && error.info.response.status == 410))
  );
}

export function isRetryableError(error: any): error is EsiError {
  return (
    isAnyEsiError(error) &&
    (error.kind == EsiErrorKind.CLIENT_ERROR ||
      error.kind == EsiErrorKind.INTERNAL_SERVER_ERROR)
  );
}

export function printError(e: any) {
  if (isAnyEsiError(e)) {
    return VError.fullStack(e);
  } else {
    return inspect(e);
  }
}
