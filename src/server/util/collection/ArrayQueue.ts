/**
 * Ring-buffer implementation of a queue.
 *
 * This implementation is relatively memory and GC-efficient as it doesn't
 * generate wrapper objects.
 *
 * Every element in the queue is assigned a "position" when it is first added.
 * These are akin to array indices and are stable throughout the life of the
 * element unless insert() is called.
 */
export class ArrayQueue<T> {
  private readonly _arr: (T | Empty)[];
  private readonly _allowResize: boolean;
  private _maxSize: number;
  private _start = 0;
  private _size = 0;
  private _startPosition = 0;

  constructor(bufferSize = 4, allowResize = true) {
    this._maxSize = bufferSize;
    this._allowResize = allowResize;
    this._arr = new Array(bufferSize).fill(Empty.VAL);
  }

  /** Number of elements currently in the queue. */
  size(): number {
    return this._size;
  }

  /** Position of the first element in the queue. */
  start(): number {
    return this._startPosition;
  }

  /** Position of the last element in the queue + 1. */
  end(): number {
    return this._startPosition + this._size;
  }

  /** Removes all elements from the queue. */
  clear(): void {
    this._start = 0;
    this._size = 0;
    this._arr.fill(Empty.VAL);
  }

  /**
   * Pushes an element to the end of the queue. Returns the position of the
   * newly-added element.
   */
  enqueue(val: T): number {
    if (this._size >= this._maxSize) {
      if (this._allowResize) {
        this._resize();
      } else {
        throw new Error(`Out of space.`);
      }
    }
    const index = (this._start + this._size) % this._maxSize;
    this._arr[index] = val;
    this._size++;
    return this._startPosition + this._size - 1;
  }

  /** Removes an element from the front of the queue. */
  dequeue(): T {
    if (this._size <= 0) {
      throw new Error(`Queue is empty.`);
    }
    const val = this._arr[this._start];
    this._arr[this._start] = Empty.VAL;
    this._start = (this._start + 1) % this._maxSize;
    this._size--;
    this._startPosition++;
    if (this._startPosition > MAX_START_POSITION) {
      this._startPosition -= MAX_START_POSITION;
    }
    return val as T;
  }

  /** Returns the front element in the queue without removing it. */
  peek(): T {
    if (this._size <= 0) {
      throw new Error(`Queue is empty.`);
    }
    return this._arr[this._start] as T;
  }

  /** Returns the rear element in the queue without removing it. */
  peekEnd(): T {
    if (this._size <= 0) {
      throw new Error(`Queue is empty.`);
    }
    return this._arr[(this._start + this._size - 1) % this._maxSize] as T;
  }

  /** Returns the element at a particular position. */
  get(position: number): T {
    return this._arr[this._index(this._getTruePosition(position))] as T;
  }

  /** Sets the element at a particular position. */
  set(position: number, value: T): void {
    const tp = this._getTruePosition(position);
    this._arr[this._index(tp)] = value;
  }

  /** Inserts an element at a particular position. */
  insert(position: number, value: T) {
    // TODO: This doesn't work when trying to insert at the end of a queue.
    const tp = this._getTruePosition(position);

    // just to increase the size of the queue, value will be thrown away
    this.enqueue(value);

    for (let p = this.end() - 1; p > tp; p--) {
      this._arr[this._index(p)] = this._arr[this._index(p - 1)];
    }
    this._arr[this._index(tp)] = value;
  }

  private _resize() {
    const increase = this._arr.length; // Double in size
    const oldLen = this._arr.length;
    for (let i = 0; i < increase; i++) {
      this._arr.push(Empty.VAL);
    }
    for (let i = 0; i < this._start; i++) {
      if (this._arr[i] == Empty.VAL) {
        break;
      }
      this._arr[i + oldLen] = this._arr[i];
      this._arr[i] = Empty.VAL;
    }

    this._maxSize += increase;
  }

  private _getTruePosition(position: number) {
    let truePosition = position;
    if (!this._isValidPosition(truePosition)) {
      truePosition -= MAX_START_POSITION;
      if (!this._isValidPosition(truePosition)) {
        throw new Error(`Position ${position} is out of bounds.`);
      }
    }
    return truePosition;
  }

  private _index(position: number) {
    return (this._start + (position - this._startPosition)) % this._maxSize;
  }

  private _isValidPosition(position: number) {
    return (
      position >= this._startPosition &&
      position < this._startPosition + this._size
    );
  }
}

enum Empty {
  VAL,
}

const MAX_START_POSITION = Math.floor(Number.MAX_SAFE_INTEGER / 2);
