import { ArrayQueue } from "../../../src/util/collection/ArrayQueue";

test("Basic contents", () => {
  const queue = new ArrayQueue<number>();
  const vals = [0, 1, 2, 3, 4, 5, 6, 7, 8];
  enqueue(queue, vals);
  expect(contents(queue)).toEqual(vals);
});

test("Basic insert", () => {
  const queue = new ArrayQueue<number>();
  enqueue(queue, [0, 1, 2, 3, 4, 5, 6, 7, 8]);
  queue.insert(5, 47);

  expect(contents(queue)).toEqual([0, 1, 2, 3, 4, 47, 5, 6, 7, 8]);
});

test("Offset growth", () => {
  const queue = new ArrayQueue<number>();
  stream(queue, 8 + 3, 7);
  enqueue(queue, [11, 12, 13, 14, 15, 16, 17, 18]);

  expect(contents(queue)).toEqual([
    4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18,
  ]);
});

test("Offset insert before break", () => {
  const queue = new ArrayQueue<number>(10, false);
  stream(queue, 16, 9);
  queue.insert(8, 47);

  expect(contents(queue)).toEqual([7, 47, 8, 9, 10, 11, 12, 13, 14, 15]);
});

test("Offset insert after break", () => {
  const queue = new ArrayQueue<number>(10, false);
  stream(queue, 16, 9);
  queue.insert(13, 47);

  expect(contents(queue)).toEqual([7, 8, 9, 10, 11, 12, 47, 13, 14, 15]);
});

// Calls enqueue() on each val in vals
function enqueue<T>(queue: ArrayQueue<T>, vals: T[]) {
  for (const val of vals) {
    queue.enqueue(val);
  }
}

// Iterates from start() to end(), calls get() on each one, and returns the
// array of the result.
function contents<T>(queue: ArrayQueue<T>) {
  const arr: T[] = [];
  const start = queue.start();
  const end = queue.end();
  for (let i = start; i < end; i++) {
    arr.push(queue.get(i));
  }
  return arr;
}

// Enqueues {length} of numbers, from 0 to length - 1. Dequeues numbers so that
// the size of the queue never exceeds {capacity}. Returns a list of all
// dequeued entries.
function stream(queue: ArrayQueue<number>, length: number, capacity: number) {
  const results: number[] = [];

  const remaining = Math.max(0, capacity - queue.size());
  let i;
  for (i = 0; i < remaining; i++) {
    queue.enqueue(i);
  }

  for (; i < length; i++) {
    results.push(queue.dequeue());
    queue.enqueue(i);
  }

  return results;
}
