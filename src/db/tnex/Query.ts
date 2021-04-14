import Bluebird = require('bluebird');
import { Knex } from 'knex';
import { Scoper } from './Scoper';
import { FilterableQuery } from './FilterableQuery';


// TODO: Change this to an interface and just have all the subclasses implement
// that interface
export class Query<T extends object, R /* return type */>
    extends FilterableQuery<T> {

  constructor(scoper: Scoper, query: Knex.QueryBuilder) {
    super(scoper, query);
  }

  public run(): Promise<R> {
    return this._query as Promise<any>;
  }
}
