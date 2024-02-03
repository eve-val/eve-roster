import { expect, test } from "@jest/globals";
import { PushableNode, flow } from "../../../../src/server/util/flow/flow.js";
import { latch, delay, Latch } from "./flow-util.js";
import { flushPromises } from "../../../test_infra/util/flush.js";

test("Basic parallel behavior", async () => {
  const result = await flow
    .of([1, 2, 3, 4, 5, 6])
    .parallelize(2, (flow) =>
      flow.map((value) => {
        if (value % 2 == 0) {
          return delay(0, () => `${value}A`);
        } else {
          return `${value}S`;
        }
      }),
    )
    .collect();

  expect(result).toEqual(["1S", "3S", "2A", "5S", "4A", "6A"]);
});

test("Out of order async execution", async () => {
  const parallelism = 3;
  const latches = new LatchHutch<number>();
  for (let i = 0; i < parallelism; i++) {
    latches.push(latch());
  }

  const promise = flow
    .of([1, 2, 3, 4, 5, 6])
    .parallelize(parallelism, (flow) =>
      flow.map((value) => {
        return latches.getNextFree().store(value);
      }),
    )
    .collect();

  await flushPromises();

  latches.releaseValue(3);
  await flushPromises();

  latches.releaseValue(2);
  latches.releaseValue(4);
  await flushPromises();

  latches.releaseValue(5);
  await flushPromises();

  latches.releaseValue(1);
  await flushPromises();

  latches.releaseValue(6);

  expect(await promise).toEqual([3, 2, 4, 5, 1, 6]);
});

test("Detailed parallel behavior", async () => {
  const results = [] as string[];
  const latches = [] as Latch<number>[];

  const promise = flow
    .of([1, 2, 3, 4, 5, 6, 7, 8, 9, 10])
    .parallelize(3, (flow) => {
      return flow.transform<string>((node) => {
        const thisLatch = latch<number>();
        latches.push(thisLatch);

        return {
          onValue(value) {
            return thisLatch.store(value).then((latchedValue) => {
              node.emit(latchedValue + "A");
            });
          },
        };
      });
    })
    .run((value) => {
      results.push(value);
    });

  await flushPromises();

  latches[2].release();
  latches[0].release();

  await flushPromises();
  expect(results).toEqual(["3A", "1A"]);

  latches[1].release();
  latches[0].release();
  latches[2].release();

  await flushPromises();
  expect(results).toEqual(["3A", "1A", "2A", "4A", "5A"]);

  latches[0].release();

  await flushPromises();
  expect(results).toEqual(["3A", "1A", "2A", "4A", "5A", "7A"]);

  latches[0].release();
  latches[1].release();

  await flushPromises();
  expect(results).toEqual(["3A", "1A", "2A", "4A", "5A", "7A", "9A", "8A"]);

  latches[1].release();
  latches[2].release();

  await promise;

  expect(results).toEqual([
    "3A",
    "1A",
    "2A",
    "4A",
    "5A",
    "7A",
    "9A",
    "8A",
    "10A",
    "6A",
  ]);
});

test("Properly close when work empty and parent runs dry", async () => {
  let head!: PushableNode<number>;
  const results: string[] = [];
  const promise = flow
    .pushable((pushable) => {
      head = pushable;
    })
    .parallelize(3, (flow) => {
      return flow.map((value) => `${value}B`);
    })
    .observe((value) => results.push(value))
    .collect();

  head.push(0);
  head.push(1);
  head.push(2);
  head.push(3);

  await flushPromises();

  expect(results).toEqual(["0B", "1B", "2B", "3B"]);

  head.close();

  const finalResults = await promise;

  expect(finalResults).toEqual(["0B", "1B", "2B", "3B"]);
});

test("Error thrown in subflow propagates", async () => {
  const promise = flow
    .of([1, 2, 3, 4])
    .parallelize(2, (flow) =>
      flow.map((value) => {
        return delay(0, () => {
          if (value == 3) {
            throw new Error(`Bad value`);
          }
          return value;
        });
      }),
    )
    .collect();

  return expect(promise).rejects.toThrow("Bad value");
});

test("Error thrown in subflow initializer propagates", () => {
  const promise = flow
    .of([1, 2, 3, 4])
    .parallelize(3, (flow) =>
      flow.transform<number>((node) => {
        return {
          onInit() {
            return delay(0, () => {
              throw new Error(`Bad init`);
            });
          },

          onValue(value) {
            node.emit(value);
          },
        };
      }),
    )
    .collect();

  return expect(promise).rejects.toThrow("Bad init");
});

class LatchHutch<T> {
  private latches: Latch<T>[] = [];

  getNextFree() {
    for (const latch of this.latches) {
      if (!latch.hasValue()) {
        return latch;
      }
    }
    throw new Error(`No free latches`);
  }

  push(latch: Latch<T>) {
    this.latches.push(latch);
  }

  releaseValue(value: T) {
    for (const latch of this.latches) {
      if (latch.value() == value) {
        latch.release();
        return;
      }
    }
    throw new Error(`No such latched value: ${value}`);
  }
}
