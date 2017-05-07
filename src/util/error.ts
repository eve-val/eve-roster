export function isAnyEsiError(error: Error) {
  return error.name && error.name.startsWith('esi:');
}
