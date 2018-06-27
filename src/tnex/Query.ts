import Bluebird = require('bluebird');
import Knex = require('knex');

import { ColumnType, Comparison, ValueWrapper, StringKeyOf, DeepPartial, } from './core';
import { Scoper } from './Scoper';


export class Query<T extends object, R /* return type */> {
  protected _scoper: Scoper;
  protected _query: Knex.QueryBuilder;

  constructor(scoper: Scoper, query: Knex.QueryBuilder) {
    this._scoper = scoper;
    this._query = query;
  }

  public run(): Bluebird<R> {
    return this._query;
  }


  /*
   * WHERE methods
   *
   * Not comprehensive. Add as necessary. See where() for warning about how
   * knex handles value bindings in its generated queries.
   */

  public where<K1 extends StringKeyOf<T>, K2 extends StringKeyOf<T>>(
      column: K1,
      cmp: Comparison,
      right: K2 | ValueWrapper<T[K1] & ColumnType>,
  ): this {
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
      this._query = this._query.whereRaw(`?? ${cmp} ??`, [rawLeft, rawRight]);
    }

    return this;
  }

  public andWhere<K1 extends StringKeyOf<T>, K2 extends StringKeyOf<T>>(
      column: K1,
      cmp: Comparison,
      right: K2 | ValueWrapper<T[K1] & ColumnType>,
  ): this {
    // andWhere in knex is just an alias to where, so there's no need to
    // duplicate logic between the two. But keeping andWhere around can help
    // improve readability of queries.
    return this.where(column, cmp, right);
  }

  public orWhere<K1 extends StringKeyOf<T>, K2 extends StringKeyOf<T>>(
      column: K1,
      cmp: Comparison,
      right: K2 | ValueWrapper<T[K1] & ColumnType>,
  ): this {

    if (right instanceof ValueWrapper) {
      this._query = this._query
          .orWhere(this._scoper.scopeColumn(column), cmp, right.value);
    } else {
      let rawLeft = this._scoper.scopeColumn(column);
      let rawRight = this._scoper.scopeColumn(right);
      this._query = this._query.orWhereRaw(`?? ${cmp} ??`, [rawLeft, rawRight]);
    }
    return this;
  }

  public whereNotNull(column: StringKeyOf<T>): this {
    this._query = this._query
        .whereNotNull(this._scoper.scopeColumn(column));

    return this;
  }

  public whereNull(column: StringKeyOf<T>): this {
    this._query = this._query
        .whereNull(this._scoper.scopeColumn(column));

    return this;
  }

  public orWhereNull(column: StringKeyOf<T>): this {
    this._query = this._query
        .orWhereNull(this._scoper.scopeColumn(column));

    return this;
  }

  public whereIn<K extends StringKeyOf<T>>(
      column: K, values: T[K][] & ColumnType[]): this {
    this._query = this._query
        .whereIn(this._scoper.scopeColumn(column), values);

    return this;
  }

    /**
   * Variant for matching against jsonb columns.
   */
  public whereContains<K1 extends StringKeyOf<T>>(
      column: K1,
      operator: '@>',
      json: DeepPartial<T[K1]> & object,
  ) {
    let rawLeft = this._scoper.scopeColumn(column);
    let rawRight = JSON.stringify(json);

    this._query =
        this._query.whereRaw(`?? ${operator} ?::jsonb`, [rawLeft, rawRight]);

    return this;
  }

  public whereNotContains<K1 extends StringKeyOf<T>>(
    column: K1,
    operator: '@>',
    json: DeepPartial<T[K1]> & object,
  ) {
    let rawLeft = this._scoper.scopeColumn(column);
    let rawRight = JSON.stringify(json);

    this._query =
        this._query.whereRaw(
            `NOT ?? ${operator} ?::jsonb`, [rawLeft, rawRight]);

    return this;
  }
}
