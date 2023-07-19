/**
 * Transforms an array of objects into a map of those objects. Each object's
 * key is its value of the specified "key property".
 */
export function arrayToMap<T, K extends keyof T>(array: T[], key: K) {
  const map = new Map<T[K], T>();
  for (const item of array) {
    map.set(item[key], item);
  }
  return map;
}

/**
 * Transforms an array into another array, removing any nil values.
 *
 * @param array The array to transform.
 * @param callback The transformation function, which converts items from the
 *    source array into items of the output array. nil return values are
 *    ignored.
 */
export function refine<Q, R>(
  array: Q[],
  callback: (value: Q) => R | undefined | null,
) {
  const len = array.length;
  const out: R[] = [];
  for (let i = 0; i < len; i++) {
    const refined = callback(array[i]);
    if (refined != undefined) {
      out.push(refined);
    }
  }
  return out;
}

/** Adds all of the entries in `entries` to a Set. */
export function addAll<T>(set: Set<T>, entries: Iterable<T>) {
  for (const e of entries) {
    set.add(e);
  }
}

/** Returns the verbatim value, or the first value from an array. */
export function first<T>(input: T | T[]): T {
  if (Array.isArray(input)) {
    return input[0];
  }
  return input;
}
