import { expect, test } from "@jest/globals";
import { flow } from "../../../../src/server/util/flow/flow.js";
import { delay } from "./flow-util.js";

test("basic test once()", async () => {
  let count = 0;

  const result = await flow
    .of([1, 2, 3])
    .once(() =>
      delay(0, () => {
        count += 1;
      }),
    )
    .observe((value) => {
      if (!count) {
        throw new Error(`Not initialized for value ${value}`);
      }
    })
    .collect();

  expect(count).toBe(1);
  expect(result).toEqual([1, 2, 3]);
});
