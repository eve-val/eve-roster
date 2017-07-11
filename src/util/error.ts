export function isAnyEsiError(error: Error) {
  return error.name != undefined && error.name.startsWith('esi:');
}
