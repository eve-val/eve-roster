/**
 * Wraps a Promise in an object that exposes explicit resolve() and reject()
 * methods.
 */
export class Resolvable<T> {
  private _promise: Promise<T>;
  private resolveFn!: (value: T | PromiseLike<T>) => void;
  private rejectFn!: (reason?: any) => void;

  get promise() {
    return this._promise;
  }

  constructor() {
    this._promise = new Promise<T>((resolve, reject) => {
      this.resolveFn = resolve;
      this.rejectFn = reject;
    });
  }

  resolve(value: T | PromiseLike<T>) {
    this.resolveFn(value);
  }

  reject(reason?: any) {
    this.rejectFn(reason);
  }
}
