import { expect, test } from "@jest/globals";
import { flow } from "../../../../src/server/util/flow/flow.js";
import { Resolvable } from "../../../../src/server/util/async/Resolvable.js";
import { flushPromises } from "../../../test_infra/util/flush.js";
import { ArrayQueue } from "../../../../src/server/util/collection/ArrayQueue.js";

test("End-to-end flow", async () => {
  const latch = queuedTransform<number, number>((value) => value);

  const emittedValues: number[] = [];

  const promise = flow
    .of([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .mapParallel(3, latch.transformer)
    .observe((value) => emittedValues.push(value))
    .collect();

  await flushPromises();
  expect(latch.receivedValues).toEqual([1, 2, 3]);

  latch.releaseInOrder(2, 1, 4, 5, 6, 7, 8);
  latch.release(9, 10);
  await flushPromises();

  expect(latch.receivedValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
  expect(emittedValues).toEqual([1, 2]);

  latch.release(3);
  await flushPromises();

  expect(latch.receivedValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
  expect(emittedValues).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);

  const results = await promise;

  expect(results).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Values arrive in order", async () => {
  const latch = queuedTransform<number, number>((value) => value);
  const promise = flow
    .of([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .mapParallel(3, latch.transformer)
    .collect();

  latch.releaseInOrder(2, 1, 4, 5, 3, 6, 8, 7, 10, 9);

  const result = await promise;

  expect(result).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10]);
});

test("Hanging values are flushed", async () => {
  const latch = queuedTransform<number, number>((value) => value);
  const promise = flow
    .of([1, 2, 3, 4])
    .mapParallel(4, latch.transformer)
    .collect();

  // This will cause the source to fully drain and thus run dry
  await flushPromises();

  latch.releaseInOrder(4, 3, 2, 1);

  const result = await promise;

  expect(result).toEqual([1, 2, 3, 4]);
});

function queuedTransform<T, U>(transformer: (value: T) => U) {
  const queue = new ArrayQueue<QueuedValue<T, U>>();
  const queuedValues = new Map<T, QueuedValue<T, U>>();

  const receivedValues: T[] = [];

  function drainBuffer() {
    while (queue.size() > 0 && queue.peek().received) {
      const qv = queue.dequeue();
      resolveQv(qv);
      qv.resolvable.resolve(transformer(qv.value));
    }
  }

  function getQv(value: T) {
    let qv = queuedValues.get(value);
    if (qv == null) {
      qv = {
        value,
        received: false,
        status: "pending",
        resolvable: new Resolvable<U>(),
      };
      queuedValues.set(value, qv);
    }
    return qv;
  }

  function resolveQv(qv: QueuedValue<T, U>) {
    qv.resolvable.resolve(transformer(qv.value));
  }

  return {
    transformer: (value: T): Promise<U> => {
      receivedValues.push(value);
      const qv = getQv(value);
      qv.received = true;
      if (qv.status == "released") {
        queueMicrotask(() => resolveQv(qv));
      } else {
        queueMicrotask(() => drainBuffer());
      }
      return qv.resolvable.promise;
    },

    releaseInOrder(...values: T[]) {
      for (const value of values) {
        const qv = getQv(value);
        if (qv.status != "pending") {
          throw new Error(`Value ${value} is already queued`);
        }
        qv.status = "queued";
        queue.enqueue(qv);
        drainBuffer();
      }
    },

    release(...values: T[]) {
      for (const value of values) {
        const qv = getQv(value);
        if (qv.status != "pending") {
          throw new Error(`Value ${value} is already queued`);
        }
        qv.status = "released";
        if (qv.received) {
          resolveQv(qv);
        }
      }
    },

    get receivedValues() {
      return receivedValues;
    },
  };
}

interface QueuedValue<T, U> {
  value: T;
  received: boolean;
  status: "pending" | "queued" | "released";
  resolvable: Resolvable<U>;
}
