import { expect, test } from "@jest/globals";
import { flow } from "../../../../src/server/util/flow/flow.js";
import { delay } from "./flow-util.js";

test("basic test", async () => {
  const observedVals = [] as number[];

  const result = await flow
    .of([1, 2, 3, 4])
    .map((value) => value + 10)
    .observe((value) => observedVals.push(value))
    .filter((value) => value % 2 == 0)
    .collect();

  expect(result).toEqual([12, 14]);
  expect(observedVals).toEqual([11, 12, 13, 14]);
});

test("basic async test", async () => {
  const result = await flow
    .of([1, 2, 3])
    .map((value) => delay(0, () => value + 1))
    .collect();

  expect(result).toEqual([2, 3, 4]);
});

test("chained async test", async () => {
  const result = await flow
    .of([1, 2, 3])
    .map((value) => delay(0, () => value + 1))
    .map((value) => value + 1)
    .map((value) => delay(0, () => value + 1))
    .collect();

  expect(result).toEqual([4, 5, 6]);
});
