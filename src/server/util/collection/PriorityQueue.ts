/**
 * A standard priority queue
 *
 * Entries can be added to the queue with {@link enqueue} and removed (in
 * order of priority) with {@link dequeue}.
 *
 * The priority of entries in the queue is determined by the {@link comparator}
 * function passed to the constructor.
 *
 * Note that while this collection is iterable, the values are not iterated in
 * priority order.
 */
export class PriorityQueue<T> implements Iterable<T> {
  // Like most priority queues, this class is an implementation of a (min)
  // binary heap. There are many good explainers for binary heaps online, but
  // in short:
  // - A binary heap is a binary tree (each node has as most two children) with
  //   the following two additional requirements:
  // - Each child is >= than its parent.
  // - The tree is complete, which essentially means that it has no gaps in its
  //   structure.
  //
  // Binary trees can be represtented by a simple array. Given a node stored at
  // position N in the array, its two children will be located at 2N + 1 and
  // 2N + 2.
  //
  // Binary heaps enforce their invariants with two operations: bubbleUp and
  // pushDown. Both functions involve recursively swapping the current node
  // with either its parent or child until the invariants are restored.

  private array: T[] = [];

  get size() {
    return this.array.length;
  }

  /**
   * @param comparator A function to define the priority of values. It should
   *    return a value less than zero if {@link a} is higher priority, a value
   *    greater than zero if {@link b} is higher priority, and zero otherwise.
   */
  constructor(private comparator: (a: T, b: T) => number) {}

  enqueue(value: T): void {
    this.array.push(value);
    this.bubbleUp();
  }

  dequeue(): T {
    if (this.array.length == 0) {
      throw new Error(`Queue is empty`);
    }

    // Swap the root node (the one we want to pop) with the one at the end of
    // array
    this.swap(0, this.array.length - 1);
    // Pop the original root node off (to be returned in a second)
    const value = this.array.pop()!;
    // Push the swapped value down to the correct location
    this.pushDown();

    return value;
  }

  peek(): T | undefined {
    return this.array.length > 0 ? this.array[0] : undefined;
  }

  private bubbleUp() {
    const arr = this.array;

    let index = arr.length - 1;
    while (index > 0) {
      const childValue = arr[index];
      const parentIndex = Math.floor((index - 1) / 2);
      const parentValue = arr[parentIndex];

      const cmp = this.comparator(childValue, parentValue);
      if (cmp < 0) {
        // Swap the values and continue upwards
        this.swap(index, parentIndex);
        index = parentIndex;
      } else {
        break;
      }
    }
  }

  private pushDown() {
    const compare = this.comparator;
    const arr = this.array;
    const len = this.array.length;

    let index = 0;

    // While at least one child is smaller, swap with that child and check
    // again
    while (index < len) {
      const i1 = index * 2 + 1;
      const i2 = index * 2 + 2;

      const cmp1 = i1 < len ? compare(arr[index], arr[i1]) : 0;
      const cmp2 = i2 < len ? compare(arr[index], arr[i2]) : 0;

      let target = -1;
      if (cmp1 > 0 && cmp2 > 0) {
        // Both children are smaller; push down to the smallest one
        target = compare(arr[i1], arr[i2]) > 0 ? i2 : i1;
      } else if (cmp1 > 0) {
        // The left child is smaller, swap with that
        target = i1;
      } else if (cmp2 > 0) {
        // The right child is smaller, swap with that
        target = i2;
      } else {
        // Both children are larger (or not present); we can stop re
        break;
      }
      this.swap(index, target);
      index = target;
    }
  }

  private swap(index1: number, index2: number) {
    const tmp = this.array[index1];
    this.array[index1] = this.array[index2];
    this.array[index2] = tmp;
  }

  [Symbol.iterator](): Iterator<T, any, undefined> {
    return this.array.values();
  }
}
