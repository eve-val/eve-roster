declare module "progress-stream" {
  import * as fs from "fs";
  import * as stream from "stream";

  function progress(options: Options): ProgressStream;

  interface ProgressStream extends stream.Transform {
    progress(): ProgressStats;
    setLength(length: number): void;

    // In order to add a 'progress' override to on(), we have to repeat all of
    // its existing overrides
    on(event: string, listener: Function): this;
    on(event: "close", listener: () => void): this;
    on(event: "drain", listener: () => void): this;
    on(event: "error", listener: (err: Error) => void): this;
    on(event: "finish", listener: () => void): this;
    on(event: "pipe", listener: (src: stream.Readable) => void): this;
    on(event: "unpipe", listener: (src: stream.Readable) => void): this;

    on(event: "progress", callback: (e: ProgressStats) => void): this;
  }

  interface ProgressStats {
    percentage: number;
    transferred: number;
    length: number;
    remaining: number;
    eta: number;
    runtime: number;
    delta: number;
    speed: number;
  }

  interface Options {
    time?: number;
    speed?: number;
    length?: number;
    drain?: boolean;
    transferred?: number;
  }

  export = progress;
}
