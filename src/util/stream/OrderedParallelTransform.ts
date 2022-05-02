import { Transform, TransformCallback } from "./Transform.js";
import { BasicCallback } from "./core.js";
import { ArrayQueue } from "../collection/ArrayQueue.js";

/**
 * Transform stream that can process multiple entities at once.
 *
 * The number of entities in flight at any time is determined by the
 * `concurrency` value passed to the constructor. Transformed values are
 * emitted in the order that they were received, regardless of how long it takes
 * to process them.
 */
export abstract class OrderedParallelTransform<In, Out> extends Transform<
  In,
  Out
> {
  private readonly _maxConcurrency: number;
  private readonly _resultBuffer: ArrayQueue<Out | Value>;
  private _errorState = false;
  private _pendingCallback: TransformCallback<Out> | null = null;
  private _finalizeCallback: BasicCallback | null = null;

  constructor(concurrency: number) {
    super({ objectMode: true });
    this._maxConcurrency = concurrency;
    this._resultBuffer = new ArrayQueue<Out>();
  }

  /**
   * Implement this method to process a single chunk in the stream. Return a
   * promise to either the transformed value or `null` if the value should be
   * ignored.
   */
  protected abstract _processChunk(chunk: In): Promise<Out | null>;

  _transform(
    chunk: In,
    encoding: string,
    callback: TransformCallback<Out>
  ): void {
    try {
      this._transformInternal(chunk, callback);
    } catch (err: any) {
      this._die(err);
    }
  }

  _final(callback: BasicCallback): void {
    if (this._errorState || this._resultBuffer.size() == 0) {
      callback();
    } else {
      this._finalizeCallback = callback;
    }
  }

  private _transformInternal(chunk: In, callback: TransformCallback<Out>) {
    const position = this._resultBuffer.enqueue(Value.PENDING);

    this._processChunk(chunk)
      .then((result) => {
        if (!this._errorState) {
          if (result == null) {
            this._resultBuffer.set(position, Value.IGNORED);
          } else {
            this._resultBuffer.set(position, result);
          }
          this._drainBuffer();
          if (
            this._resultBuffer.size() < this._maxConcurrency &&
            this._pendingCallback
          ) {
            const cb = this._pendingCallback;
            this._pendingCallback = null;
            cb();
          }
        }
      })
      .catch((err: any) => {
        if (!this._errorState) {
          this._die(err);
        }
      });
    if (this._resultBuffer.size() < this._maxConcurrency) {
      callback();
    } else {
      this._pendingCallback = callback;
    }
  }

  private _drainBuffer() {
    while (this._resultBuffer.size() > 0) {
      if (this._resultBuffer.peek() == Value.PENDING) {
        break;
      }

      const val = this._resultBuffer.dequeue();
      if (val != Value.IGNORED) {
        this.push(val as Out);
      }
    }
    if (this._resultBuffer.size() == 0 && this._finalizeCallback != null) {
      const cb = this._finalizeCallback;
      this._finalizeCallback = null;
      cb();
    }
  }

  private _die(err: Error) {
    this._errorState = true;
    this._resultBuffer.clear();
    this.emit("error", err);
  }
}

enum Value {
  PENDING,
  IGNORED,
}
