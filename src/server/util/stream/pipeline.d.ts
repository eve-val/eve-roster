/* global NodeJS */

import { WriteStream } from "./Writable.js";
import { ReadStream } from "./Readable.js";
import { ReadWriteStream } from "./Duplex.js";

export function pipeline<T1, Last extends WriteStream<T1>>(
  stream1: ReadStream<T1>,
  stream2: Last,
  callback: PipelineCallback,
): Last;
export function pipeline<T1, T2, Last extends WriteStream<T2>>(
  stream1: ReadStream<T1>,
  stream2: ReadWriteStream<T1, T2>,
  stream3: Last,
  callback: PipelineCallback,
): Last;
export function pipeline<T1, T2, T3, Last extends WriteStream<T3>>(
  stream1: ReadStream<T1>,
  stream2: ReadWriteStream<T1, T2>,
  stream3: ReadWriteStream<T2, T3>,
  stream4: Last,
  callback: PipelineCallback,
): Last;
export function pipeline<T1, T2, T3, T4, Last extends WriteStream<T4>>(
  stream1: ReadStream<T1>,
  stream2: ReadWriteStream<T1, T2>,
  stream3: ReadWriteStream<T2, T3>,
  stream4: ReadWriteStream<T3, T4>,
  stream5: Last,
  callback: PipelineCallback,
): Last;

export function pipelinePr<T1>(
  stream1: ReadStream<T1>,
  stream2: WriteStream<T1>,
): Promise<void>;
export function pipelinePr<T1, T2>(
  stream1: ReadStream<T1>,
  stream2: ReadWriteStream<T1, T2>,
  stream3: WriteStream<T2>,
): Promise<void>;
export function pipelinePr<T1, T2, T3>(
  stream1: ReadStream<T1>,
  stream2: ReadWriteStream<T1, T2>,
  stream3: ReadWriteStream<T2, T3>,
  stream4: WriteStream<T3>,
): Promise<void>;
export function pipelinePr<T1, T2, T3, T4>(
  stream1: ReadStream<T1>,
  stream2: ReadWriteStream<T1, T2>,
  stream3: ReadWriteStream<T2, T3>,
  stream4: ReadWriteStream<T3, T4>,
  stream5: WriteStream<T4>,
): Promise<void>;

type PipelineCallback = (err: NodeJS.ErrnoException) => void;
