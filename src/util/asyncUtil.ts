import Bluebird = require('bluebird');

/**
 * Calls `callback(item, index)` on each item in `list`. Returns a Promise
 * wrapping all of the values returned by the callback calls.
 */
export function parallelize<T, U>(
    list: T[],
    callback: (value: T, index: number) => U | Bluebird<U>,
    ): Bluebird<U[]> {
  let work = [] as (U | Bluebird<U>)[];

  for (let i = 0; i < list.length; i++) {
    work.push(callback(list[i], i));
  }
  return Bluebird.all(work);
}

/**
 * Calls `callback(item, index)` on each item in `list`. If `callback`
 * returns a `Promise`, waits until the promise resolves before calling
 * `callback` on the next item in the list.
 */
export function serialize<T, U>(
    list: T[],
    callback: (value: T, index: number) => U | Bluebird<U>,
    ): Bluebird<U[]> {
  let results = [] as U[];

  return iterate(0);

  function iterate(i: number): Bluebird<U[]> {
    if (i >= list.length) {
      return Bluebird.resolve(results);
    } else {
      return Bluebird.resolve(callback(list[i], i))
      .then(result => {
        results.push(result);
        return iterate(i + 1);
      });
    }
  }
}

/**
 * Repeatedly executes `callback` until it returns `undefined` (or a Promise
 * that resolves to `undefined`). `callback` is passed the result of the
 * previous execution. If this is the first execution, `initialValue` is
 * passed instead.
 */
export function doWhile<T>(
    initialValue: T,
    callback: (value: T) => T | undefined | Bluebird<T | undefined>
    ): Bluebird<void> {
  return Bluebird.try(() => {
    return callback(initialValue);
  })
  .then(result => {
    if (result == undefined) {
      return undefined;
    } else {
      return doWhile(result, callback);
    }
  });
}

export function delay(ms: number) {
  return new Promise(resolve => {
    setTimeout(resolve, ms);
  });
}
