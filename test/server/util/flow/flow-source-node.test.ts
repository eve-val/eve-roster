import { expect, test } from "@jest/globals";
import { flow } from "../../../../src/server/util/flow/flow.js";
import { delay, latchedTransform, nextMicrotask } from "./flow-util.js";
import { flushPromises } from "../../../test_infra/util/flush.js";

test("sync error in first onRead()", () => {
  const promise = flow
    .from<number>((_node) => {
      return {
        onRead() {
          throw new Error("onRead error");
        },
      };
    })
    .run();

  return expect(promise).rejects.toThrow("onRead error");
});

test("async error in onRead()", () => {
  const promise = flow
    .from<number>((node) => {
      let count = 0;

      return {
        async onRead() {
          await delay(0, () => {});
          if (count < 2) {
            node.emit(count);
            count++;
          } else {
            throw new Error("onRead error");
          }
        },
      };
    })
    .run();

  return expect(promise).rejects.toThrow("onRead error");
});

test("mixed async and sync reads", async () => {
  const result = await flow
    .from<number>((node) => {
      let count = -1;

      return {
        onRead() {
          count += 1;
          if (count % 3 == 0) {
            return delay(0, () => {
              node.emit(count);
            });
          } else if (count < 7) {
            node.emit(count);
          } else {
            node.close();
          }
          return;
        },
      };
    })
    .collect();

  expect(result).toEqual([0, 1, 2, 3, 4, 5, 6]);
});

test("onInit waits until promise resolved", async () => {
  expect.assertions(1);

  await flow
    .from<number>((node) => {
      let initialized = false;

      return {
        onInit() {
          return delay(0, () => {
            initialized = true;
          });
        },

        onRead() {
          expect(initialized).toBe(true);
          node.close();
        },
      };
    })
    .run();
});

test("onInit error is caught (sync)", () => {
  const promise = flow
    .from<number>((node) => {
      return {
        onInit() {
          throw new Error("onInit error");
        },

        onRead() {
          node.close();
        },
      };
    })
    .run();

  return expect(promise).rejects.toThrow("onInit error");
});

test("onInit error is caught (async)", () => {
  const promise = flow
    .from<number>((node) => {
      return {
        onInit() {
          return delay(0, () => {
            throw new Error("onInit error");
          });
        },

        onRead() {
          node.close();
        },
      };
    })
    .run();

  return expect(promise).rejects.toThrow("onInit error");
});

test("Multiple emits per read are supported", async () => {
  const maxEmits = 3;

  const result = await flow
    .from<number>((node) => {
      let count = 0;

      return {
        async onRead() {
          count += 1;
          node.emit(count);
          node.emit(count);
          await nextMicrotask();
          node.emit(count);
          node.emit(count);

          if (count >= maxEmits) {
            node.close();
          }
        },
      };
    })
    .collect();

  expect(result).toEqual([1, 1, 1, 1, 2, 2, 2, 2, 3, 3, 3, 3]);
});

test("Backpressure throttles reads", async () => {
  let readCount = 0;
  const latch = latchedTransform();

  flow
    .from<number>((node) => {
      return {
        async onRead() {
          readCount += 1;
          node.emit(readCount);
          if (readCount >= 3) {
            node.close();
          }
        },
      };
    })
    .map(latch.transformer)
    .collect();

  await flushPromises();

  expect(readCount).toBe(1);

  latch.release(1);

  await flushPromises();

  expect(readCount).toBe(2);
});

test("Backpressure throttles reads with multi-emit", async () => {
  let readCount = 0;
  const latch = latchedTransform();

  flow
    .from<number>((node) => {
      return {
        async onRead() {
          readCount += 1;
          node.emit(readCount);
          node.emit(readCount);
          node.emit(readCount);
          if (readCount >= 3) {
            node.close();
          }
        },
      };
    })
    .map(latch.transformer)
    .collect();

  await flushPromises();
  expect(readCount).toBe(1);

  latch.release(1);
  await flushPromises();
  latch.release(1);
  await flushPromises();
  latch.release(1);
  await flushPromises();

  expect(readCount).toBe(2);
});
