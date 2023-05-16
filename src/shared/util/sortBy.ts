import { KeysOfType, nil } from "../../shared/util/simpleTypes.js";

/**
 * Sorts an array of objects by one or more properites of those objects.
 *
 * This method calls Array.sort() under the hood, and so has all the same
 * fundamental behaviors (in-place sort, etc).
 *
 * @param arr The array to sort.
 * @param comparitors One or more comparison functions. These can be any
 *    function, although in most cases you will want to pass the result of
 *    calling one of the cmp___() functions defined below. For each pair of
 *    array elements, comparitors are executed in the order passed until one
 *    of them returns a non-zero value. That value is then used to sort the
 *    two elements.
 * @returns The sorted array. Because sorting is done in-place, this will be
 *    the same object as `arr`.
 */
export function sortBy<T>(arr: T[], ...comparitors: Comparitor<T>[]): T[] {
  const len = comparitors.length;
  arr.sort((a, b) => {
    for (let i = 0; i < len; i++) {
      const ret = comparitors[i](a, b);
      if (ret != 0) {
        return ret;
      }
    }
    return 0;
  });

  return arr;
}

export type Comparitor<T> = (a: T, b: T) => number;
export type Extractor<T, S> = (obj: T) => S | null;
export type SortNulls = "frontNulls" | "endNulls";
export type SortDirection = "forward" | "reverse";

/**
 * Creates a Comparitor that sorts elements by whether a property is null or
 * not. All elements where `prop` is `null` are sorted to either the beginning
 * or the end. Non-null elements have their ordering retained.
 *
 * @param sortNulls Sort nulls to either the beginning or the end. NOTE THAT
 *    `undefined` VALUES ARE ALWAYS SORTED TO THE END; this is a feature of
 *    Array.sort().
 */
export function cmpNullProp<T>(
  prop: keyof T,
  sortNulls: SortNulls = "endNulls"
): Comparitor<T> {
  return (a: T, b: T) => {
    const aVal = a[prop];
    const bVal = b[prop];
    let ret: number;
    if (aVal == null && bVal != null) {
      ret = 1;
    } else if (bVal == null && aVal != null) {
      ret = -1;
    } else {
      ret = 0;
    }

    if (sortNulls == "frontNulls") {
      ret = -ret;
    }

    return ret;
  };
}

/**
 * Creates a Comparitor that performs a lexical sort over a string property.
 *
 * @param prop Either the name of the property to sort by or an extractor
 *    function. Extractor functions are passed the object and must return a
 *    string (or null) to sort on.
 * @param direction By default sorts in ascending order. Pass 'reverse' to sort
 *    in descending order.
 * @param sortNulls Sort nulls to either the beginning or the end. NOTE THAT
 *    `undefined` VALUES ARE ALWAYS SORTED TO THE END; this is a feature of
 *    Array.sort().
 */
export function cmpStringProp<T, K extends KeysOfType<T, string | nil>>(
  prop: K | Extractor<T, string>,
  direction: SortDirection = "forward",
  sortNulls: SortNulls = "endNulls"
): Comparitor<T> {
  return (a: T, b: T) => {
    const aVal: string = typeof prop == "function" ? prop(a) : (a[prop] as any);
    const bVal: string = typeof prop == "function" ? prop(b) : (b[prop] as any);
    let ret: number;

    if (aVal == null || bVal == null) {
      ret = compareNullable(aVal, bVal, sortNulls);
    } else {
      ret = aVal.localeCompare(bVal);
    }

    if (direction == "reverse") {
      ret = -ret;
    }

    return ret;
  };
}

/**
 * Creates a Comparitor that performs a numerical sort over a number property.
 *
 * @param prop Either the name of the property to sort by or an extractor
 *    function. Extractor functions are passed the object and must return a
 *    number (or null) to sort on.
 * @param direction By default sorts in ascending order. Pass 'reverse' to sort
 *    in descending order.
 * @param sortNulls Sort nulls to either the beginning or the end. NOTE THAT
 *    `undefined` VALUES ARE ALWAYS SORTED TO THE END; this is a feature of
 *    Array.sort().
 */
export function cmpNumberProp<T, K extends KeysOfType<T, number | nil>>(
  prop: K | Extractor<T, number>,
  direction: SortDirection = "forward",
  sortNulls: SortNulls = "endNulls"
): Comparitor<T> {
  return (a: T, b: T) => {
    const aVal: number = typeof prop == "function" ? prop(a) : (a[prop] as any);
    const bVal: number = typeof prop == "function" ? prop(b) : (b[prop] as any);
    let ret: number;

    if (aVal == null || bVal == null) {
      ret = compareNullable(aVal, bVal, sortNulls);
    } else {
      ret = aVal - bVal;
    }

    if (direction == "reverse") {
      ret = -ret;
    }

    return ret;
  };
}

function compareNullable<T>(a: T | null, b: T | null, sortNulls: SortNulls) {
  if (a == null && b != null) {
    return sortNulls == "frontNulls" ? -1 : 1;
  } else if (b == null && a != null) {
    return sortNulls == "frontNulls" ? 1 : -1;
  } else {
    return 0;
  }
}
