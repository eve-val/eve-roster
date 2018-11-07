import { ArrayQueue } from './collection/ArrayQueue';

/**
 * Provides a way to rate-limit access to a resource.
 *
 * Calls to ready() return a new Promise. These Promises are guaranteed to
 * resolve in the order they were created and to resolve no faster than once
 * per `minInterval` of milliseconds.
 */
export class RateLimiter {
  private readonly _minInterval: number;
  private readonly _queue = new ArrayQueue<() => void>();
  private _lastCheckout: number = 0;

  constructor(minInterval: number) {
    if (minInterval <= 0) {
      throw new Error(`Invalid minInternal ${minInterval}, must be > 0`);
    }

    this._minInterval = minInterval;
  }

  ready() {
    return new Promise(resolve => {
      if (this._queue.size() == 0
          && Date.now() - this._lastCheckout > this._minInterval) {
        this._lastCheckout = Date.now();
        resolve();
      } else {
        this._queue.enqueue(resolve);
        if (this._queue.size() == 1) {
          this._scheduleTimeout();
        }
      }
    });
  }

  private _scheduleTimeout() {
    const remaining =
        Math.max(0, this._minInterval - (Date.now() - this._lastCheckout));
    setTimeout(() => {
      const callback = this._queue.dequeue();
      this._lastCheckout = Date.now();
      if (this._queue.size() > 0) {
        this._scheduleTimeout();
      }
      callback();
    }, remaining);
  }
}
