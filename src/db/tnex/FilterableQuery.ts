import { Knex } from "knex";
import {
  ColumnType,
  Comparison,
  ValueWrapper,
  StringKeyOf,
  DeepPartial,
} from "./core";
import { Scoper } from "./Scoper";

/**
 * Base class for things that can specify WHERE clauses.
 *
 * These are either (a) queries (such as Select) or (b) nested WHERE clauses
 * (see and() and or()).
 */
export class FilterableQuery<T extends object> {
  protected _scoper: Scoper;
  protected _query: Knex.QueryBuilder;

  constructor(scoper: Scoper, query: Knex.QueryBuilder) {
    this._scoper = scoper;
    this._query = query;
  }

  public toSql() {
    return this._query.toString();
  }

  public where<K1 extends StringKeyOf<T>, K2 extends StringKeyOf<T>>(
    column: K1,
    cmp: Comparison,
    right: K2 | ValueWrapper<T[K1] & ColumnType>
  ): this {
    if (right instanceof ValueWrapper) {
      // This is a simple where clause that has every row compared to the
      // specified constant value. This works properly with knex's assumptions
      // about the third argument to its where function.
      this._query.where(this._scoper.scopeColumn(column), cmp, right.value);
    } else {
      // Assume that right is a column name, so this will be a complex where
      // clause. While perfectly valid SQL, knex assumes that every rvalue is
      // actually a constant binding. So instead of generating
      //   WHERE x = y, it generates WHERE x = ? and then binds it to 'y'.
      // Thus the resulting query does not return expected results.
      // To get around this, build up a raw query part.
      const rawLeft = this._scoper.scopeColumn(column);
      const rawRight = this._scoper.scopeColumn(right);
      this._query.whereRaw(`?? ${cmp} ??`, [rawLeft, rawRight]);
    }

    return this;
  }

  public andWhere<K1 extends StringKeyOf<T>, K2 extends StringKeyOf<T>>(
    column: K1,
    cmp: Comparison,
    right: K2 | ValueWrapper<T[K1] & ColumnType>
  ): this {
    // andWhere in knex is just an alias to where, so there's no need to
    // duplicate logic between the two. But keeping andWhere around can help
    // improve readability of queries.
    return this.where(column, cmp, right);
  }

  public orWhere<K1 extends StringKeyOf<T>, K2 extends StringKeyOf<T>>(
    column: K1,
    cmp: Comparison,
    right: K2 | ValueWrapper<T[K1] & ColumnType>
  ): this {
    if (right instanceof ValueWrapper) {
      this._query = this._query.orWhere(
        this._scoper.scopeColumn(column),
        cmp,
        right.value
      );
    } else {
      const rawLeft = this._scoper.scopeColumn(column);
      const rawRight = this._scoper.scopeColumn(right);
      this._query = this._query.orWhereRaw(`?? ${cmp} ??`, [rawLeft, rawRight]);
    }
    return this;
  }

  public whereNotNull(column: StringKeyOf<T>): this {
    this._query = this._query.whereNotNull(this._scoper.scopeColumn(column));

    return this;
  }

  public whereNull(column: StringKeyOf<T>): this {
    this._query = this._query.whereNull(this._scoper.scopeColumn(column));

    return this;
  }

  public orWhereNull(column: StringKeyOf<T>): this {
    this._query = this._query.orWhereNull(this._scoper.scopeColumn(column));

    return this;
  }

  public whereIn<K extends StringKeyOf<T>>(
    column: K,
    values: T[K][] & ColumnType[]
  ): this {
    this._query = this._query.whereIn(this._scoper.scopeColumn(column), values);

    return this;
  }

  public whereNotIn<K extends StringKeyOf<T>>(
    column: K,
    values: T[K][] & ColumnType[]
  ): this {
    this._query = this._query.whereNotIn(
      this._scoper.scopeColumn(column),
      values
    );

    return this;
  }

  /** Variant for matching against jsonb columns. */
  public whereContains<K1 extends StringKeyOf<T>>(
    column: K1,
    operator: "@>",
    json: DeepPartial<T[K1]> & object
  ) {
    const rawLeft = this._scoper.scopeColumn(column);
    const rawRight = JSON.stringify(json);

    this._query = this._query.whereRaw(`?? ${operator} ?::jsonb`, [
      rawLeft,
      rawRight,
    ]);

    return this;
  }

  public whereNotContains<K1 extends StringKeyOf<T>>(
    column: K1,
    operator: "@>",
    json: DeepPartial<T[K1]> & object
  ) {
    const rawLeft = this._scoper.scopeColumn(column);
    const rawRight = JSON.stringify(json);

    this._query = this._query.whereRaw(`NOT ?? ${operator} ?::jsonb`, [
      rawLeft,
      rawRight,
    ]);

    return this;
  }

  /** Begins a boolean parenthetical. Equivalent of `AND (...)` */
  public and(
    callback: (this: FilterableQuery<T>, builder: FilterableQuery<T>) => void
  ): this {
    this._query.where((qb: Knex.QueryBuilder) => {
      const filter = new FilterableQuery<T>(this._scoper, qb);
      callback.call(filter, filter);
    });

    return this;
  }

  /** Begins a boolean parenthetical. Equivalent of `OR (...)` */
  public or(
    callback: (this: FilterableQuery<T>, builder: FilterableQuery<T>) => void
  ): this {
    this._query.orWhere((qb: Knex.QueryBuilder) => {
      const filter = new FilterableQuery<T>(this._scoper, qb);
      callback.call(filter, filter);
    });

    return this;
  }
}
