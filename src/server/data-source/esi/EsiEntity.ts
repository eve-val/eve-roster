import util, { InspectOptions } from "node:util";

export class EsiEntity {
  constructor(
    public readonly category: "character" | "corporation" | "type",
    public readonly id: number,
    public readonly name: string,
  ) {}

  toString(): string {
    return `{ ${this.name}, ${this.id} }`;
  }

  [util.inspect.custom](
    _depth: number,
    _opts: InspectOptions,
    _inspect: typeof util.inspect,
  ) {
    return this.toString();
  }
}

export function esiChar(id: number, name: string) {
  return new EsiEntity("character", id, name);
}

export function esiCorp(id: number, name: string) {
  return new EsiEntity("corporation", id, name);
}

export function esiType(id: number, name: string) {
  return new EsiEntity("type", id, name);
}
