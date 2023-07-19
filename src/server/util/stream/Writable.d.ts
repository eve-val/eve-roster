import { EventEmitter } from "events";
import { ReadStream } from "./Readable.js";
import { BasicCallback } from "./core.js";

export interface Writable<T> extends WriteStream<T> {}
export class Writable<T> {
  constructor(opts?: WritableOptions<Writable<T>, T>);

  _write(chunk: T, encoding: string, callback: BasicCallback): void;
  _writev?(
    chunks: { chunk: T; encoding: string }[],
    callback: BasicCallback,
  ): void;
  _destroy(error: Error | null, callback: BasicCallback): void;
  _final(callback: BasicCallback): void;
}

export interface WriteStream<T> extends EventEmitter {
  writable: boolean;
  readonly writableHighWaterMark: number;
  readonly writableLength: number;
  write(chunk: T, cb?: (error: Error | null | undefined) => void): boolean;
  write(
    chunk: T,
    encoding?: string,
    cb?: (error: Error | null | undefined) => void,
  ): boolean;
  setDefaultEncoding(encoding: string): this;
  end(cb?: () => void): void;
  end(chunk: T, cb?: () => void): void;
  end(chunk: T, encoding?: string, cb?: () => void): void;
  cork(): void;
  uncork(): void;
  destroy(error?: Error): void;

  /**
   * Event emitter
   * The defined events on documents including:
   * 1. close
   * 2. drain
   * 3. error
   * 4. finish
   * 5. pipe
   * 6. unpipe
   */
  addListener(event: "close", listener: () => void): this;
  addListener(event: "drain", listener: () => void): this;
  addListener(event: "error", listener: (err: Error) => void): this;
  addListener(event: "finish", listener: () => void): this;
  addListener(event: "pipe", listener: (src: ReadStream<T>) => void): this;
  addListener(event: "unpipe", listener: (src: ReadStream<T>) => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "close"): boolean;
  emit(event: "drain"): boolean;
  emit(event: "error", err: Error): boolean;
  emit(event: "finish"): boolean;
  emit(event: "pipe", src: ReadStream<T>): boolean;
  emit(event: "unpipe", src: ReadStream<T>): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;

  on(event: "close", listener: () => void): this;
  on(event: "drain", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "finish", listener: () => void): this;
  on(event: "pipe", listener: (src: ReadStream<T>) => void): this;
  on(event: "unpipe", listener: (src: ReadStream<T>) => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  once(event: "close", listener: () => void): this;
  once(event: "drain", listener: () => void): this;
  once(event: "error", listener: (err: Error) => void): this;
  once(event: "finish", listener: () => void): this;
  once(event: "pipe", listener: (src: ReadStream<T>) => void): this;
  once(event: "unpipe", listener: (src: ReadStream<T>) => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;

  prependListener(event: "close", listener: () => void): this;
  prependListener(event: "drain", listener: () => void): this;
  prependListener(event: "error", listener: (err: Error) => void): this;
  prependListener(event: "finish", listener: () => void): this;
  prependListener(event: "pipe", listener: (src: ReadStream<T>) => void): this;
  prependListener(
    event: "unpipe",
    listener: (src: ReadStream<T>) => void,
  ): this;
  prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this;

  prependOnceListener(event: "close", listener: () => void): this;
  prependOnceListener(event: "drain", listener: () => void): this;
  prependOnceListener(event: "error", listener: (err: Error) => void): this;
  prependOnceListener(event: "finish", listener: () => void): this;
  prependOnceListener(
    event: "pipe",
    listener: (src: ReadStream<T>) => void,
  ): this;
  prependOnceListener(
    event: "unpipe",
    listener: (src: ReadStream<T>) => void,
  ): this;
  prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this;

  removeListener(event: "close", listener: () => void): this;
  removeListener(event: "drain", listener: () => void): this;
  removeListener(event: "error", listener: (err: Error) => void): this;
  removeListener(event: "finish", listener: () => void): this;
  removeListener(event: "pipe", listener: (src: ReadStream<T>) => void): this;
  removeListener(event: "unpipe", listener: (src: ReadStream<T>) => void): this;
  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void,
  ): this;
}

export interface WritableOptions<This, T> {
  highWaterMark?: number;
  decodeStrings?: boolean;
  objectMode?: boolean;
  write?(this: This, chunk: T, encoding: string, callback: BasicCallback): void;
  writev?(
    this: This,
    chunks: { chunk: T; encoding: string }[],
    callback: BasicCallback,
  ): void;
  destroy?(this: This, error: Error | null, callback: BasicCallback): void;
  final?(this: This, callback: BasicCallback): void;
}
