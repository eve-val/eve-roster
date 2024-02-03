import { expect, test } from "@jest/globals";
import { flow } from "../../../../src/server/util/flow/flow.js";

test("basic batch behavior", async () => {
  const result = await flow.of([0, 1, 2, 3, 4, 5, 6, 7]).batch(3).collect();

  expect(result).toEqual([
    [0, 1, 2],
    [3, 4, 5],
    [6, 7],
  ]);
});
