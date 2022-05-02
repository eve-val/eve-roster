import { Readable } from "./Readable.js";

/**
 * Given an asynchronous 'iterator' that returns an array of objects,
 * repeatedly "reads" from the iterator until the iterator returns an empty
 * array.
 *
 * Primarily useful for iterating over rows in a database.
 */
export class BatchedObjectReadable<S> extends Readable<S> {
  private readonly _iterator: StreamIterator<S>;

  private _state: "dormant" | "draining" | "drained" | "error" = "dormant";

  constructor(iterator: StreamIterator<S>) {
    super({
      objectMode: true,
    });
    this._iterator = iterator;
  }

  _read(_size: number): void {
    this._performRead().catch((err) => {
      this._state = "error";
      process.nextTick(() => this.emit("error", err));
    });
  }

  private async _performRead() {
    if (this._state != "dormant") {
      throw new Error(`Cannot read: state is ${this._state}.`);
    }
    this._state = "draining";

    const objs = await this._iterator.next();
    for (const obj of objs) {
      this.push(obj);
    }

    if (objs.length == 0) {
      this._state = "drained";
      this.push(null);
    } else {
      this._state = "dormant";
    }
  }
}

export interface StreamIterator<S> {
  next(): Promise<S[]>;
}
