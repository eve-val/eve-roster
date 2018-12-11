import { BasicCallback } from '../../util/stream/core';

/**
 * Array iteration for callback-based async execution.
 *
 * For each item in the array, executes `handler()` on the item. Handlers
 * are executed one at a time.
 */
export function asyncEach<T>(
    arr: T[],
    handler: (entry: T, callback: BasicCallback) => void,
    callback: BasicCallback,
) {
  let i = 0;
  const len = arr.length;
  function next() {
    if (i >= len) {
      callback();
    } else {
      handler(arr[i], function(err) {
        if (err) {
          callback(err);
        } else {
          i++;
          next();
        }
      })
    }
  }
  next();
}
