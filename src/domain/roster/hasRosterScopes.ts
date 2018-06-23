
/**
 * Returns true if the list of scopes contains everything necessary to run a
 * roster sync.
 */
export function hasRosterScopes(scopes: string[] | null) {
  if (scopes == null) {
    return false;
  }
  return scopes.indexOf(
      'esi-corporations.read_corporation_membership.v1') != -1
      && scopes.indexOf('esi-corporations.track_members.v1') != -1
      && scopes.indexOf('esi-corporations.read_titles.v1') != -1;
}
