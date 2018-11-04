import { Writable } from './Writable';
import { BasicCallback } from './core';

/**
 * Abstract writable stream that batches writes in order to improve performance.
 *
 * Most appropriate for batching together expensive DB writes.
 */
export abstract class BatchedObjectWritable<T> extends Writable<T> {
  private readonly _buffer: (T | null)[];
  private readonly _maxSize: number;
  private _size: number = 0;

  constructor(batchSize: number) {
    super({ objectMode: true });
    this._maxSize = batchSize;
    this._buffer = new Array(batchSize).fill(null);
  }

  /**
   * Implement your writing logic here.
   */
  protected abstract _flush(chunks: T[]): Promise<void>;

  /**
   * Option method to filter incoming elements. Return Value.IGNORED to prevent
   * the element from entering the batch.
   */
  protected _onBeforeWrite(chunk: T): T | Value {
    return chunk;
  }

  async _write(chunk: T, encoding: string, callback: BasicCallback) {
    this._writeToBuffer(chunk);
    if (this._size >= this._maxSize) {
      await this._flushInternal()
      .then(() => {
        callback();
      })
      .catch(err => {
        callback(err);
      });
    } else {
      callback();
    }
  }

  async _writev(
      chunks: { chunk: T, encoding: string }[],
      callback: BasicCallback,
      ) {
    let errorState = false;
    for (let chunk of chunks) {
      this._writeToBuffer(chunk.chunk);
      if (this._size >= this._maxSize) {
        try {
          await this._flushInternal();
        } catch (e) {
          errorState = true;
          callback(e);
          break;
        }
      }
    }
    if (!errorState) {
      callback();
    }
  }

  _final(callback: BasicCallback) {
    if (this._size == 0) {
      callback();
    } else {
      this._flushInternal()
      .then(() => callback())
      .catch(err => callback(err));
    }
  }

  private async _flushInternal() {
    let outBuffer =
        this._size == this._buffer.length
            ? this._buffer
            : this._buffer.slice(0, this._size);

    await this._flush(outBuffer as T[]);
    this._size = 0;
    this._buffer.fill(null);
  }

  private _writeToBuffer(chunk: T) {
    const transformedChunk = this._onBeforeWrite(chunk);
    if (transformedChunk != Value.IGNORED) {
      this._buffer[this._size] = chunk;
      this._size++;
    }
  }
}

export enum Value { IGNORED }
