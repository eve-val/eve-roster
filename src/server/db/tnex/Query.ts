import { Knex } from "knex";
import { Scoper } from "./Scoper.js";
import { FilterableQuery } from "./FilterableQuery.js";

// TODO: Change this to an interface and just have all the subclasses implement
// that interface
export class Query<
  T extends object,
  R /* return type */,
> extends FilterableQuery<T> {
  constructor(scoper: Scoper, query: Knex.QueryBuilder) {
    super(scoper, query);
  }

  public run(): Promise<R> {
    return this._query as Promise<any>;
  }
}
