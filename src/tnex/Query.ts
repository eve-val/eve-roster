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
   * Not comprehensive. Add as necessary.
   */

  public where<K extends keyof T, R extends keyof T>(
      column: K,
      cmp: Comparison,
      right: R | ValueWrapper<T[K]>): this {
    this._query = this._query
        .where(
            this._scoper.scopeColumn(column), cmp, this._scopeRVal(right));
    return this;
  }

  public andWhere<K extends keyof T, R extends keyof T>(
      column: K,
      cmp: Comparison,
      right: R | ValueWrapper<T[K]>): this {
    this._query = this._query
        .andWhere(
            this._scoper.scopeColumn(column), cmp, this._scopeRVal(right));
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

  private _scopeRVal<K extends keyof T, R extends keyof T>(
      rval: R | ValueWrapper<T[K]>) {
    if (rval instanceof ValueWrapper) {
      return rval.value;
    } else {
      return this._scoper.scopeColumn(rval);
    }
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
