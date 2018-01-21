const nameCache = new Map();

/**
 * Mixin for the `methods` object on Vue components. Gives the component access
 * to a global list of EVE id -> name mappings.
 *
 * In order to avoid data duplication, some server endpoints return a single
 * map of ID -> name at the end of the response instead of sprinkling in `name`
 * fields throughout.
 *
 * Whenever a component receives a network request that contains an id -> name
 * map, it should call addNames(). This allows any child components to
 * access the map without needing to pass it to them explicitly.
 */
export const NameCacheMixin = {
  addNames(names) {
    for (let id in names) {
      nameCache.set(parseInt(id), names[id]);
    }
  },

  name(id) {
    return nameCache.get(id) || 'Unknown entity';
  },
}
