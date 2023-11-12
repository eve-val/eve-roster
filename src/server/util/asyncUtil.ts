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
 * Given a list of jobs, runs the jobs in parallel until all are completed.
 *
 * This method is similar to `Promise.allSettled`, but optimized for situations
 * that may involve a large number of parallel jobs. It has the following
 * differences:
 *
 * - Callers can set [maxParallelism], which limits the maximum number of
 * active jobs at any one time.
 *
 * - Results from individual jobs are streamed to the caller as soon as they
 * complete (via the [resultHandler] callback). This eliminates the need to
 * store the result of all jobs in memory until the entire batch completes.
 *
 * @param params.jobs An array of objects representing the jobs to perform
 * @param params.worker A function that can convert a job object to a Promise
 * @param params.resultHandler A function that accepts the result of a
 *    completed job.
 * @returns A Promise<void> that will be fulfilled when all jobs complete (both
 *    resolving and rejecting are considered to be complete).
 */
export async function streamParallelJobs<T, R>(params: {
  jobs: T[];
  worker: (jobSource: T) => Promise<R>;
  resultHandler: (result: PromiseSettledResult<R>, index: number) => void;
  maxParallelism?: number;
}) {
  const jobSources = params.jobs;
  const maxParallelism = params.maxParallelism ?? -1;

  return new Promise<void>((resolve) => {
    const initialBatchSize =
      maxParallelism > 0
        ? Math.min(jobSources.length, maxParallelism)
        : jobSources.length;

    let nextJobIndex = 0;
    let completedJobsCount = 0;
    for (let i = 0; i < initialBatchSize; i++) {
      launchNextJob();
    }

    function launchNextJob() {
      if (nextJobIndex >= jobSources.length) {
        throw new Error(
          `Trying to launch job ${nextJobIndex} but only have` +
            ` ${jobSources.length} total jobs.`,
        );
      }

      const jobIndex = nextJobIndex;
      nextJobIndex++;
      params
        .worker(jobSources[jobIndex])
        .then((value) => {
          params.resultHandler(
            {
              status: "fulfilled",
              value,
            },
            jobIndex,
          );
          onJobComplete();
        })
        .catch((reason) => {
          params.resultHandler(
            {
              status: "rejected",
              reason,
            },
            jobIndex,
          );
          onJobComplete();
        });
    }

    function onJobComplete() {
      completedJobsCount++;
      if (completedJobsCount == jobSources.length) {
        resolve();
      } else if (nextJobIndex < jobSources.length) {
        launchNextJob();
      }
    }
  });
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
