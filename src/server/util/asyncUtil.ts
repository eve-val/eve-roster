import pLimit from "p-limit";

/**
 * Calls `callback(item, index)` on each item in `list`. Returns a Promise
 * wrapping all of the values returned by the callback calls.
 */
export function parallelize<T, U>(
  list: T[],
  callback: (value: T, index: number) => U | PromiseLike<U>,
  limit = Infinity,
): Promise<U[]> {
  const work = [] as (U | PromiseLike<U>)[];
  const l = pLimit(limit);

  for (let i = 0; i < list.length; i++) {
    work.push(
      l(() => {
        return callback(list[i], i);
      }),
    );
  }
  return Promise.all(work);
}

/**
 * Calls `callback(item, index)` on each item in `list`. If `callback`
 * returns a `Promise`, waits until the promise resolves before calling
 * `callback` on the next item in the list.
 */
export async function serialize<T, U>(
  list: T[],
  callback: (value: T, index: number) => U | PromiseLike<U>,
): Promise<U[]> {
  const results = [] as U[];

  for (let i = 0; i < list.length; i++) {
    results.push(await callback(list[i], i));
  }
  return results;
}

export function delay(ms: number) {
  return new Promise<void>((resolve) => {
    setTimeout(resolve, ms);
  });
}
