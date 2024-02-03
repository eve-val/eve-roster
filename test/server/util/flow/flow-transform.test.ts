import { expect, test } from "@jest/globals";
import {
  TransformMethods,
  flow,
} from "../../../../src/server/util/flow/flow.js";
import { delay, latch, post } from "./flow-util.js";

test("transform catches errors thrown in onValue (sync)", () => {
  const result = flow
    .of([1, 2, 3, 4])
    .filter((value) => {
      if (value == 4) {
        throw new Error("Filter error");
      } else {
        return true;
      }
    })
    .collect();

  return expect(result).rejects.toThrow("Filter error");
});

test("transform catches errors thrown in onValue (async))", () => {
  const result = flow
    .of([1, 2, 3, 4])
    .filter((value) =>
      delay(0, () => {
        if (value == 2) {
          throw new Error("Filter error");
        } else {
          return true;
        }
      }),
    )
    .collect();

  return expect(result).rejects.toThrow("Filter error");
});

test("transform catches errors thrown in onValue (sync but async downstream)", () => {
  const result = flow
    .of([1, 2, 3, 4])
    .filter((value) => {
      if (value == 2) {
        throw new Error("Filter error");
      } else {
        return true;
      }
    })
    .map((value) => delay(0, () => value))
    .collect();

  return expect(result).rejects.toThrow("Filter error");
});

test("Errors thrown in init are properly caught (sync)", () => {
  const promise = flow
    .of([1, 2, 3, 4])
    .transform<number>((node) => {
      return {
        onInit() {
          throw new Error("Init error");
        },

        onValue(value) {
          node.emit(value);
        },
      };
    })
    .map((value) => value * 2)
    .run();

  return expect(promise).rejects.toThrow("Init error");
});

test("Errors thrown in init are properly caught (async)", () => {
  const promise = flow
    .of([1, 2, 3, 4])
    .transform<number>((node) => {
      return {
        onInit() {
          return delay(0, () => {
            throw new Error("Init error");
          });
        },

        onValue(value) {
          node.emit(value);
        },
      };
    })
    .map((value) => value * 2)
    .run();

  return expect(promise).rejects.toThrow("Init error");
});

test("Close (sync)", async () => {
  const result = await flow
    .of([1, 2, 3, 4])
    .transform<number>((node) => {
      return {
        onValue(value) {
          if (value == 3) {
            node.close();
          }
          node.emit(value * 2);
        },
      };
    })
    .collect();

  expect(result).toEqual([2, 4]);
});

test("Close (async)", async () => {
  const result = await flow
    .of([1, 2, 3, 4])
    .transform<number>((node) => {
      return {
        onValue(value) {
          return delay(0, () => {
            if (value == 3) {
              node.close();
            }
            node.emit(value * 2);
          });
        },
      };
    })
    .collect();

  expect(result).toEqual([2, 4]);
});

test("Downstream values continue to flow after close", async () => {
  let transformNode!: TransformMethods<number>;
  const mapLatch = latch<number>();

  const promise = flow
    .of([1, 2, 3, 4])
    .transform<number>((node) => {
      transformNode = node;

      return {
        onValue(value) {
          return post(() => {
            node.emit(value * 2);
          });
        },
      };
    })
    .map((value) => {
      return mapLatch.store(value + 1);
    })
    .collect();

  await mapLatch.waitForValue(5);
  transformNode.close();
  mapLatch.release();

  const result = await promise;
  expect(result).toEqual([3, 5]);
});
