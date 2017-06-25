import Promise = require('bluebird');
import Knex = require('knex');

import { ColumnType, Comparison, ValueWrapper } from './core';
import { Scoper } from './Scoper';


export class Query<T extends object, R /* return type */> {
  protected _scoper: Scoper;
  protected _query: Knex.QueryBuilder;

  private _wasRun = false;

  constructor(scoper: Scoper, query: Knex.QueryBuilder, shouldBeRun: boolean) {
    this._scoper = scoper;
    this._query = query;

    if (shouldBeRun) {
      checkQueryWasRunOnNextTick(this);
    }
  }

  public run(): Promise<R> {
    this._wasRun = true;
    return this._query;
  }


  /*
   * WHERE methods
   * 
   * Not comprehensive. Add as necessary. See where() for warning about how
   * knex handles value bindings in its generated queries.
   */

  public where<K extends keyof T, R extends keyof T>(
      column: K,
      cmp: Comparison,
      right: R | ValueWrapper<T[K]>): this {
    if (right instanceof ValueWrapper) {
      // This is a simple where clause that has every row compared to the
      // specified constant value. This works properly with knex's assumptions
      // about the third argument to its where function.
      this._query = this._query
          .where(this._scoper.scopeColumn(column), cmp, right.value);
    } else {
      // Assume that right is a column name, so this will be a complex where
      // clause. While perfectly valid SQL, knex assumes that every rvalue is
      // actually a constant binding. So instead of generating
      //   WHERE x = y, it generates WHERE x = ? and then binds it to 'y'.
      // Thus the resulting query does not return expected results.
      // To get around this, build up a raw query part.
      let rawLeft = this._scoper.scopeColumn(column);
      let rawRight = this._scoper.scopeColumn(right);
      this._query = this._query.whereRaw(`${rawLeft} ${cmp} ${rawRight}`);
    }

    return this;
  }

  public andWhere<K extends keyof T, R extends keyof T>(
      column: K,
      cmp: Comparison,
      right: R | ValueWrapper<T[K]>): this {
    // andWhere in knex is just an alias to where, so there's no need to
    // duplicate logic between the two. But keeping andWhere around can help
    // improve readability of queries.
    return this.where(column, cmp, right);
  }

  public whereNotNull(column: keyof T): this {
    this._query = this._query
        .whereNotNull(this._scoper.scopeColumn(column));

    return this;
  }

  public whereNull(column: keyof T): this {
    this._query = this._query
        .whereNull(this._scoper.scopeColumn(column));

    return this;
  }

  public whereIn<K extends keyof T>(column: K, values: T[K][]): this {
    this._query = this._query
        .whereIn(this._scoper.scopeColumn(column), values);

    return this;
  }

  public assertWasRun() {
    if (!this._wasRun) {
      throw new Error(`The following query was created but not run:`
          + ` ${this._query.toString()}`);
    }
  }
}


let timeoutRegistered = false;
let queriesToCheck = [] as Query<any, any>[];

function checkQueryWasRunOnNextTick(query: Query<any, any>) {
  queriesToCheck.push(query);
  if (!timeoutRegistered) {
    timeoutRegistered = true;
    setTimeout(checkPendingQueries, 0);
  }
}

function checkPendingQueries() {
  for (let query of queriesToCheck) {
    query.assertWasRun();
  }
  timeoutRegistered = false;
  queriesToCheck.length = 0;
}
