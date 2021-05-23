/* global NodeJS */

import { WritableOptions } from "./Writable";
import { ReadStream, ReadableOptions } from "./Readable";
import { BasicCallback } from "./core";

export interface Duplex<In, Out> extends ReadWriteStream<In, Out> {}
export class Duplex<In, Out> {
  constructor(opts?: DuplexOptions<Duplex<In, Out>, In>);

  _read?(size: number): void;
  _destroy?(error: Error | null, callback: BasicCallback): void;

  _write(chunk: Out, encoding: string, callback: BasicCallback): void;
  _writev?(
    chunks: Array<{ chunk: Out; encoding: string }>,
    callback: BasicCallback
  ): void;
  _final(callback: BasicCallback): void;
}

export interface ReadWriteStream<In, Out> {
  writable: boolean;
  readonly writableHighWaterMark: number;
  readonly writableLength: number;
  write(chunk: In, cb?: (error: Error | null | undefined) => void): boolean;
  write(
    chunk: In,
    encoding?: string,
    cb?: (error: Error | null | undefined) => void
  ): boolean;
  setDefaultEncoding(encoding: string): this;
  end(cb?: () => void): void;
  end(chunk: In, cb?: () => void): void;
  end(chunk: In, encoding?: string, cb?: () => void): void;
  cork(): void;
  uncork(): void;
  destroy(error?: Error): void;

  readable: boolean;
  readonly readableHighWaterMark: number;
  readonly readableLength: number;
  read(size?: number): Out;
  setEncoding(encoding: string): this;
  pause(): this;
  resume(): this;
  isPaused(): boolean;
  unpipe<T extends NodeJS.WritableStream>(destination?: T): this;
  unshift(chunk: Out): void;
  wrap(oldStream: NodeJS.ReadableStream): this;
  push(chunk: Out | null, encoding?: string): boolean;

  /**
   * Event emitter
   * The defined events on documents including:
   * 1. close (both)
   * 2. error (both)
   * 3. drain (writable)
   * 4. finish (writable)
   * 5. pipe (writable)
   * 6. unpipe (writable)
   * 7. data (readable)
   * 8. readable (readable)
   * 9. end (readable)
   */
  addListener(event: "close", listener: () => void): this;
  addListener(event: "error", listener: (err: Error) => void): this;
  addListener(event: "drain", listener: () => void): this;
  addListener(event: "finish", listener: () => void): this;
  addListener(event: "pipe", listener: (src: ReadStream<In>) => void): this;
  addListener(event: "unpipe", listener: (src: ReadStream<In>) => void): this;
  addListener(event: "data", listener: (chunk: Out) => void): this;
  addListener(event: "readable", listener: () => void): this;
  addListener(event: "end", listener: () => void): this;
  addListener(event: string | symbol, listener: (...args: any[]) => void): this;

  emit(event: "close"): boolean;
  emit(event: "error", err: Error): boolean;
  emit(event: "drain"): boolean;
  emit(event: "finish"): boolean;
  emit(event: "pipe", src: ReadStream<In>): boolean;
  emit(event: "unpipe", src: ReadStream<In>): boolean;
  emit(event: "data", chunk: Out): boolean;
  emit(event: "end"): boolean;
  emit(event: "readable"): boolean;
  emit(event: string | symbol, ...args: any[]): boolean;

  on(event: "close", listener: () => void): this;
  on(event: "error", listener: (err: Error) => void): this;
  on(event: "drain", listener: () => void): this;
  on(event: "finish", listener: () => void): this;
  on(event: "pipe", listener: (src: ReadStream<In>) => void): this;
  on(event: "unpipe", listener: (src: ReadStream<In>) => void): this;
  on(event: "data", listener: (chunk: Out) => void): this;
  on(event: "end", listener: () => void): this;
  on(event: "readable", listener: () => void): this;
  on(event: string | symbol, listener: (...args: any[]) => void): this;

  once(event: "close", listener: () => void): this;
  once(event: "error", listener: (err: Error) => void): this;
  once(event: "drain", listener: () => void): this;
  once(event: "finish", listener: () => void): this;
  once(event: "pipe", listener: (src: ReadStream<In>) => void): this;
  once(event: "unpipe", listener: (src: ReadStream<In>) => void): this;
  once(event: "data", listener: (chunk: Out) => void): this;
  once(event: "end", listener: () => void): this;
  once(event: "readable", listener: () => void): this;
  once(event: string | symbol, listener: (...args: any[]) => void): this;

  prependListener(event: "close", listener: () => void): this;
  prependListener(event: "error", listener: (err: Error) => void): this;
  prependListener(event: "drain", listener: () => void): this;
  prependListener(event: "finish", listener: () => void): this;
  prependListener(event: "pipe", listener: (src: ReadStream<In>) => void): this;
  prependListener(
    event: "unpipe",
    listener: (src: ReadStream<In>) => void
  ): this;
  prependListener(event: "data", listener: (chunk: Out) => void): this;
  prependListener(event: "end", listener: () => void): this;
  prependListener(event: "readable", listener: () => void): this;
  prependListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this;

  prependOnceListener(event: "close", listener: () => void): this;
  prependOnceListener(event: "error", listener: (err: Error) => void): this;
  prependOnceListener(event: "drain", listener: () => void): this;
  prependOnceListener(event: "finish", listener: () => void): this;
  prependOnceListener(
    event: "pipe",
    listener: (src: ReadStream<In>) => void
  ): this;
  prependOnceListener(
    event: "unpipe",
    listener: (src: ReadStream<In>) => void
  ): this;
  prependOnceListener(event: "data", listener: (chunk: Out) => void): this;
  prependOnceListener(event: "end", listener: () => void): this;
  prependOnceListener(event: "readable", listener: () => void): this;
  prependOnceListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this;

  removeListener(event: "close", listener: () => void): this;
  removeListener(event: "error", listener: (err: Error) => void): this;
  removeListener(event: "drain", listener: () => void): this;
  removeListener(event: "finish", listener: () => void): this;
  removeListener(event: "pipe", listener: (src: ReadStream<In>) => void): this;
  removeListener(
    event: "unpipe",
    listener: (src: ReadStream<In>) => void
  ): this;
  removeListener(event: "data", listener: (chunk: Out) => void): this;
  removeListener(event: "end", listener: () => void): this;
  removeListener(event: "readable", listener: () => void): this;
  removeListener(
    event: string | symbol,
    listener: (...args: any[]) => void
  ): this;
}

export interface DuplexOptions<This, In>
  extends WritableOptions<This, In>,
    ReadableOptions<This> {
  allowHalfOpen?: boolean;
  readableObjectMode?: boolean;
  writableObjectMode?: boolean;
}
