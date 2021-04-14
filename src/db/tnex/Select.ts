import { Knex } from 'knex';
import Bluebird = require('bluebird');

import { Comparison, Link, Nullable, StringKeyOf } from './core';
import { Scoper } from './Scoper';
import { Query } from './Query';
import { RenamedJoin } from './RenamedJoin';
import { checkNotNil } from '../../util/assert';

interface ColumnSelect {
  column: string,
  alias?: string,
}

/**
 * Class that represents a SELECT query in SQL. As the name of the class
 * suggests, the tricky part of such statements are the joins. A Joiner keeps
 * track of two sets of columns: J, the set of "joined columns", i.e. all off
 * the columns contained in the original table plus all joined tables, and S,
 * the set of all "selected columns", i.e. all columns in J that have been
 * selected via calls to columns(), columnAs(), or aggregator functions like
 * sum(). In other words, J determines what columns _may_ be selected, while
 * S determines what columns _have_ been selected.
 *
 * Because of the design of Joiner, calls to methods that select columns
 * usually occur at the _end_ of a chain of calls, not at the beginning as is
 * traditionally the case in SQL select statements.
 */
export class Select<J extends object /* joined */, S /* selected */>
    extends Query<J, S[]> {
  private _knex: Knex;
  private _subqueryTableName: string | undefined;

  private _selectedColumns = [] as ColumnSelect[];
  private _pendingSelectedColumns = [] as  ColumnSelect[];

  constructor(
      knex: Knex,
      scoper: Scoper,
      table: J,
      subqueryTableName?: string,
      ) {
    super(
        scoper.mirror(),
        knex(scoper.getTableName(table)));
    this._knex = knex;
    this._subqueryTableName = subqueryTableName;
  }

  public run(): Promise<S[]> {
    if (this._subqueryTableName != null) {
      throw new Error(`Subqueries can't be run().`);
    }
    this._query = this._query.select(this._getPendingColumnSelectStatements());

    return super.run();
  }

  public fetchFirst(): Promise<S | null> {
    return this.run()
    .then(rows => {
      return rows[0];
    });
  }

  public columns<K extends StringKeyOf<J>>(...columns: K[])
      : Select<J, S & Pick<J, K>> {
    if (this._subqueryTableName != null) {
      throw new Error(
          `Subqueries don't support columns(). Use columnAs() instead.`);
    }

    for (let column of columns) {
      this._pendingSelectedColumns.push({ column })
    }

    return this as any;
  }

  /**
   * Select a column and give it a new name in the result row.
   *
   * IMPORTANT: If this is a subquery, `alias` must by scoped with the
   * subquery's table name. For example:
   *
   * tnex.subquery('foo', myTable).columnAs('myTable_id', 'foo_id')
   *
   * @param column The column to select.
   * @param alias The desired name of the column in the result set.
   */
  public columnAs<K extends StringKeyOf<J>, L extends string>(
      column: K,
      alias: L,
  ): Select<J, S & Link<J, K, L>> {
    this._pendingSelectedColumns.push({ column, alias });

    return this as any;
  }


  /*
   * Join methods
   */

  // Subjoin
  public join<T extends object, E>(
      subselect: Select<T, E>,
      left: StringKeyOf<E>,
      cmp: Comparison,
      right: StringKeyOf<J>,
      ): Select<J & E, S>;
  // Renamed join
  public join<T extends object, E>(
      renamedTable: RenamedJoin<T, E>,
      left: StringKeyOf<E>,
      cmp: Comparison,
      right: StringKeyOf<J>,
      ): Select<J & E, S>;
  // Normal join
  public join<T extends object>(
      table: T,
      left: StringKeyOf<T>,
      cmp: Comparison,
      right: StringKeyOf<J>,
  ): Select<J & T, S>;
  // Implementation
  public join(
      table: object,
      left: string,
      cmp: Comparison,
      right: string,
  ) {
    let joinTarget: string | Knex.QueryBuilder;

    let requiredPrefix: string | undefined;
    if (table instanceof Select) {
      joinTarget = this._processSubJoin(table);
      requiredPrefix = checkNotNil(table._subqueryTableName);
      this._scoper.registerSyntheticPrefix(requiredPrefix);
    } else if (table instanceof RenamedJoin) {
      joinTarget = this._processRenamedJoin(table);
      this._scoper.registerSyntheticPrefix(table.tableAlias);
    } else {
      joinTarget = this._processJoin(table);
    }

    this._query = this._query.join(
          joinTarget,
          this._scoper.scopeColumn(left, requiredPrefix),
          cmp,
          this._scoper.scopeColumn(right));

    return this;
  }


  // Subselect
  public leftJoin<T extends object, E>(
      sub: Select<T, E>,
      left: StringKeyOf<E>,
      cmp: Comparison,
      right: StringKeyOf<J>,
      ): Select<J & Nullable<E>, S>;
  // Renamed join
  public leftJoin<T extends object, E>(
      join: RenamedJoin<T, E>,
      left: StringKeyOf<E>,
      cmp: Comparison,
      right: StringKeyOf<J>,
      ): Select<J & Nullable<E>, S>;
  // Normal
  public leftJoin<T extends object>(
      table: T,
      left: StringKeyOf<T>,
      cmp: Comparison,
      right: StringKeyOf<J>,
      ): Select<J & Nullable<T>, S>;
  // Implementation
  public leftJoin(
      table: object,
      left: string,
      cmp: Comparison,
      right: string,
      ) {

    let joinTarget: string | Knex.QueryBuilder;
    let requiredPrefix: string | undefined;

    if (table instanceof Select) {
      joinTarget = this._processSubJoin(table);
      requiredPrefix = checkNotNil(table._subqueryTableName);
      this._scoper.registerSyntheticPrefix(requiredPrefix);
    } else if (table instanceof RenamedJoin) {
      joinTarget = this._processRenamedJoin(table);
      this._scoper.registerSyntheticPrefix(table.tableAlias);
    } else {
      joinTarget = this._processJoin(table);
    }

    this._query = this._query.leftJoin(
          joinTarget,
          this._scoper.scopeColumn(left),
          cmp,
          this._scoper.scopeColumn(right));

    return this;
  }

  private _processJoin<T extends object>(table: T) {
    return this._scoper.getTableName(table);
  }

  private _processSubJoin<T extends object, E>(sub: Select<T, E>) {
    if (sub._subqueryTableName == null) {
      throw new Error(
          `Query is not a subquery. Use subselect() instead of select()`);
    }

    let subquery = sub._query;
    if (sub._pendingSelectedColumns.length > 0) {
      subquery = subquery.select(sub._getPendingColumnSelectStatements());
    }
    return subquery.as(sub._subqueryTableName);
  }

  private _processRenamedJoin<T extends object, E>(join: RenamedJoin<T, E>) {
    // We don't need to check that the prefixes match -- that's already
    // been checked in RenamedJoin.using()
    return `${this._scoper.getTableName(join.table)} as ${join.tableAlias}`;
  }

  /*
   * Aggregate methods
   *
   * Not comprehensive. Add as necessary.
   */

  public sum<K extends StringKeyOf<J>, L extends string>(
      column: K,
      alias: L,
      ): Select<J, S & Link<J, K, L>> {

    this._query = this._query.sum(this._prepForSelect(column, alias));
    return this as any;
  }

  public count<K extends StringKeyOf<J>, L extends string>(
      column: K,
      alias: L,
      ): Select<J, S & Link<J, K, L>> {

    // TODO: Flag that this might need to be converted from a string to a
    // number.
    this._query = this._query.count(this._prepForSelect(column, alias));
    return this as any;
  }

  public max<K extends StringKeyOf<J>, L extends string>(
      column: K,
      alias: L,
      ): Select<J, S & Link<J, K, L>> {

    this._query = this._query.max(this._prepForSelect(column, alias));
    return this as any;
  }


  /*
   * Misc methods
   */

  public groupBy(column: StringKeyOf<J>): this {
    this._query = this._query.groupBy(this._scoper.scopeColumn(column));
    return this;
  }

  public distinct(column: StringKeyOf<J>): this {
    this._query = this._query.distinct(this._scoper.scopeColumn(column));
    return this;
  }

  /**
   * Groups by the specified column and, for each group, selects the first row
   * that would be returned.
   *
   * In order to avoid undefined behavior you must specify an ordering
   * (with orderBy()). The first column in the ordering must be the one passed
   * here.
   *
   * This is a Postgres-only extension.
   */
  public distinctOn<K extends StringKeyOf<J>>(
      column: K,
  ): Select<J, S & Pick<J, K>> {
    const scopedCol = this._scoper.scopeColumn(column);
    this._query = this._query.distinct(
        this._knex.raw(`ON (??) ?? as ??`, [scopedCol, scopedCol, column]));

    return this as any;
  }

  /**
   * Orders the results by the specified column and direction. Subsequent calls
   * append order clauses (instead of replacing the previous ones).
   */
  public orderBy(column: StringKeyOf<J>, direction: 'asc' | 'desc'): this {
    this._query = this._query.orderBy(
        this._scoper.scopeColumn(column), direction);
    return this;
  }

  public limit(size: number): this {
    this._query = this._query.limit(size);
    return this;
  }

  public offset(count: number): this {
    this._query = this._query.offset(count);
    return this;
  }


  /*
   * Helper methods
   */

  private _getPendingColumnSelectStatements() {
    return this._pendingSelectedColumns.map(cs => {
      return this._prepForSelect(cs.column, cs.alias);
    });
  }

  private _prepForSelect(prefixedColumn: string, alias?: string) {
    if (this._subqueryTableName == undefined) {
      // "character.id as character_id"
      // "character.id as foobar"
      return `${this._scoper.scopeColumn(prefixedColumn)} as`
          + ` ${alias || prefixedColumn}`;
    } else {
      if (alias == undefined) {
        throw new Error(
            `Unexpectedly undefined alias for "${prefixedColumn}".`);
      }
      let [prefix] = this._scoper.splitColumn(alias);
      if (prefix != this._subqueryTableName) {
        throw new Error(
            `Alias "${alias}" for column "${prefixedColumn}" must be`
                + ` prefixed with "${this._subqueryTableName}".`);
      }

      // local.unprefixedColumn as unprefixedAlias
      // "character.id as myId"
      return `${this._scoper.scopeColumn(prefixedColumn)} as `
          + `${this._scoper.stripPrefix(alias)}`;
    }
  }
}
