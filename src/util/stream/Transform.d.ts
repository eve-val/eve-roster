import { Duplex, DuplexOptions } from "./Duplex";

export class Transform<In, Out> extends Duplex<In, Out> {
  constructor(opts?: DuplexOptions<Transform<In, Out>, In, Out>);

  _transform?(
    chunk: In,
    encoding: string,
    callback: TransformCallback<Out>
  ): void;

  _flush?(callback: TransformCallback<Out>): void;
}

export type TransformCallback<T> = (error?: Error, data?: T) => void;
