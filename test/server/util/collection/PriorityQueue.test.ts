import { expect, test } from "@jest/globals";
import { PriorityQueue } from "../../../../src/server/util/collection/PriorityQueue.js";

test("Priority order is preserved", () => {
  const queue = new PriorityQueue(noDuplicatesComparator);
  push(queue, 2, 4, 7, 1, 5, 3, 6);

  expect(drain(queue)).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

test("Peek", () => {
  const queue = new PriorityQueue(noDuplicatesComparator);
  push(queue, 4, 3, 5, 7, 6, 2, 1);

  expect(queue.peek()).toBe(1);
  expect(queue.dequeue()).toBe(1);
});

test("Remove then add", () => {
  const queue = new PriorityQueue(noDuplicatesComparator);
  push(queue, 6, 2, 5, 4, 7, 1, 3);

  queue.dequeue();
  expect(queue.peek()).toBe(2);

  queue.enqueue(1);
  queue.enqueue(8);

  expect(queue.peek()).toBe(1);
  expect(drain(queue)).toEqual([1, 2, 3, 4, 5, 6, 7, 8]);
});

test("Duplicate values", () => {
  const queue = new PriorityQueue<number>((a, b) => a - b);
  push(queue, 4, 3, 4, 1, 2, 2, 2);

  expect(drain(queue)).toEqual([1, 2, 2, 2, 3, 4, 4]);
});

test("Iterable", () => {
  const queue = new PriorityQueue(noDuplicatesComparator);
  push(queue, 6, 2, 5, 4, 7, 1, 3);

  const result = Array.from(queue).sort((a, b) => a - b);
  expect(result).toEqual([1, 2, 3, 4, 5, 6, 7]);
});

function noDuplicatesComparator(a: number, b: number) {
  if (a == b) {
    throw new Error(`Same value compared: ${a}`);
  }
  return a - b;
}

function push<T>(queue: PriorityQueue<T>, ...values: T[]) {
  for (const value of values) {
    queue.enqueue(value);
  }
}

function drain<T>(queue: PriorityQueue<T>): T[] {
  const result: T[] = [];
  while (queue.size > 0) {
    result.push(queue.dequeue());
  }
  return result;
}
