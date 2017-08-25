export function isAnyEsiError(error: Error) {
  return error.name != undefined && error.name.startsWith('esi:');
}

export function isEsiNotFoundError(error: Error) {
  return error.name != undefined && error.name.startsWith('esi:NotFoundError');
}

export function isMissingCharError(error: any) {
  if (isEsiNotFoundError(error)) {
    return true;
  } else if (error.jse_cause && error.jse_cause.status == 410) {
    return true;
  }
}
