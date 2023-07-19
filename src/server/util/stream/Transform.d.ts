import { Duplex, DuplexOptions } from "./Duplex.js";

export class Transform<In, Out> extends Duplex<In, Out> {
  constructor(opts?: DuplexOptions<Transform<In, Out>, In>);

  _transform?(
    chunk: In,
    encoding: string,
    callback: TransformCallback<Out>,
  ): void;

  _flush?(callback: TransformCallback<Out>): void;
}

export type TransformCallback<T> = (error?: Error, data?: T) => void;
