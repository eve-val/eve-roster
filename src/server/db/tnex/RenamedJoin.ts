import { Link } from "./core.js";
import { Scoper } from "./Scoper.js";

export class RenamedJoin<T extends object, U> {
  public readonly table: T;
  public readonly tableAlias: string;
  private _registry: Scoper;

  constructor(table: T, tableAlias: string, registry: Scoper) {
    this.table = table;
    this.tableAlias = tableAlias;
    this._registry = registry;
  }

  public using<K extends keyof T, L extends string>(
    column: K,
    alias: L,
  ): RenamedJoin<T, U & Link<T, K, L>> {
    const [prefix] = this._registry.splitColumn(alias);

    if (prefix != this.tableAlias) {
      throw new Error(
        `Alias "${alias}" for column "${String(column)}" must be` +
          ` prefixed with "${this.tableAlias}".`,
      );
    }

    return this;
  }
}
