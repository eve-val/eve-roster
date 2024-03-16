import util, { InspectOptions } from "node:util";

export class EsiEntity {
  constructor(
    public readonly id: number,
    public readonly name: string,
  ) {}

  toString(): string {
    return `{ ${this.name}, ${this.id} }"`;
  }

  [util.inspect.custom](
    _depth: number,
    _opts: InspectOptions,
    _inspect: typeof util.inspect,
  ) {
    return this.toString();
  }
}
