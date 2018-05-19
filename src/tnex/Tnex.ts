import { inspect } from 'util';

import Bluebird = require('bluebird');
import Knex = require('knex');

import { ValueWrapper, ColumnType, SimpleObj, val } from './core';
import { Scoper } from './Scoper';
import { Select } from './Select';
import { Query } from './Query';
import { RenamedJoin } from './RenamedJoin';
import { Update } from './Update';

const USE_DEFAULT = {};

export const DEFAULT_NUM: number = USE_DEFAULT as any;
export const DEFAULT_STR: string = USE_DEFAULT as any;
export const DEFAULT_BOOL: boolean = USE_DEFAULT as any;

export class Tnex {
  private _knex: Knex;
  private _registry: Scoper;
  private _rootKnex: Knex;

  constructor(
      knex: Knex,
      registry: Scoper,
      rootKnex: Knex) {
    this._knex = knex;
    this._registry = registry;
    this._rootKnex = rootKnex;
  }

  knex(): Knex {
    return this._knex;
  }

  raw(query: string, bindings: any[]) {
    return this._knex.raw(query, bindings);
  }

  transaction<T>(callback: (db: Tnex) => Bluebird<T>): Bluebird<T> {
    if (this._isTransaction()) {
      return callback(this);
    } else {
      return this._knex.transaction(trx => {
        return callback(new Tnex(trx, this._registry, this._knex));
      });
    }
  }

  /**
   * Like transaction(), but returns a Promise instead of a Bluebird.
   * Transitional method until Tnex is converted to using native Promises.
   */
  asyncTransaction<T>(callback: (db: Tnex) => Promise<T>): Promise<T> {
    if (this._isTransaction()) {
      return callback(this);
    } else {
      return Promise.resolve(this._knex.transaction(trx => {
        return callback(new Tnex(trx, this._registry, this._knex));
      }));
    }
  }

  public select<T extends object>(table: T): Select<T, {}> {
    return new Select<T, {}>(this._knex, this._registry, table);
  }

  public subselect<T extends object>(startingTable: T, asTableName: string) {
    return new Select<T, {}>(
        this._knex,
        this._registry,
        startingTable,
        asTableName);
  }

  public alias<T extends object>(table: T, alias: string): RenamedJoin<T, {}> {
    return new RenamedJoin(table, alias, this._registry);
  }

  public insert<T extends object, R extends T = T>(
      table: T, row: R): Bluebird<void>;
  public insert<T extends object, K extends keyof T, R extends T = T>(
      table: T, row: R, returning: K): Bluebird<T[K]>;
  public insert
      <T extends object, K extends keyof T, L extends keyof T, R extends T = T>
      (table: T, row: R, returning: [K, L]): Bluebird<[T[K], T[L]]>;
  public insert<
      T extends object,
      K extends keyof T,
      L extends keyof T,
      M extends keyof T,
      R extends T = T>
      (table: T, row: R, returning: [K, L, M]): Bluebird<[T[K], T[L], T[M]]>;
  public insert<T extends object, R extends T = T>(
      table: T, row: R, returning?: string|string[]) {
    let tableName = this._registry.getTableName(table);
    return this._knex(tableName)
        .insert(
            this._prepForInsert(row, table),
            this._prepReturningKeys(returning))
        .then(rows => {
          return rows[0];
        });
  }

  public insertAll<T extends object>(table: T, rows: T[]): Bluebird<void>;
  public insertAll<T extends object, K extends keyof T>(
      table: T, rows: T[], returning: K): Bluebird<T[K][]>;
  public insertAll<T extends object>(
      table: T, rows: T[], returning?: string|string[]) {
    let tableName = this._registry.getTableName(table);
    return this._knex(tableName)
        .insert(
            rows.map(row => this._prepForInsert(row, table)),
            this._prepReturningKeys(returning));
  }

  public batchInsert<T extends Object, R extends T>(
      table: T,
      rows: T[],
      chunkSize?: number,
      ): Bluebird<number[]> {
    return this._knex.batchInsert(
        this._registry.getTableName(table),
        rows.map(row => this._prepForInsert(row, table)),
        chunkSize as any, // bug in typings doesn't allow undef
        );
  }

  public update<T extends object>(
    table: T,
    values: Partial<T>,
  ): Update<T, {}> {
    return new Update(
        this._knex, this._registry, table, this._prepForInsert(values, table));
  }

  /**
   * Updates multiple rows at once. Rows must have a unique ID column (as
   * specified in the `idColumn` parameter).
   */
  public updateAll<T extends object, K extends keyof T>(
      table: T,
      idColumn: K,
      rows: Array<Partial<T> & Pick<T, K>>,
  ) {
    // Query structure:
    // UPDATE tableName SET
    //     tableName.col1 = _synthTable.col1,
    //     tableName.col2 = _synthTable.col2,
    //     ...
    // FROM (VALUES (col1_value, col2_value, ...), ...))
    // AS _synthTable(col1, col2, ...)
    // WHERE _synthTable.idCol = tableName.idCol

    const tableName = this._registry.getTableName(table);
    const strippedId = this._registry.stripPrefix(idColumn);
    const synthTable = `__updatesFor_${tableName}`;

    const query: string[] = [];
    const bindings: string[] = [];
    const cols: (keyof T)[] = [idColumn];

    query.push(`UPDATE ?? SET`);
    bindings.push(tableName);

    const assignmentClause: string[] = [];
    for (let v in rows[0]) {
      if (!table.hasOwnProperty(v)) {
        throw new Error(`Table ${tableName} doesn't have a column named ${v}.`);
      }
      if (v == idColumn) {
        continue;
      }
      cols.push(v as any);

      const stripped = this._registry.stripPrefix(v);

      assignmentClause.push(`?? = ??.??`);
      bindings.push(stripped, synthTable, stripped);
    }
    query.push(assignmentClause.join(', '));

    query.push(`FROM (VALUES`);

    const rowValueClause = `(${ new Array(cols.length).fill('?').join(',') })`;
    query.push(new Array(rows.length).fill(rowValueClause).join(', '));
    for (let row of rows) {
      for (let col of cols) {
        const val = (row as any)[col];
        if (val == undefined) {
          throw new Error(`Column ${col} is undefined in row ${inspect(row)}.`);
        }
        bindings.push(val);
      }
    }
    query.push(')');

    query.push(`AS ??(`);
    bindings.push(synthTable);
    query.push(new Array(cols.length).fill('??').join(','))
    bindings.push(...cols.map(col => this._registry.stripPrefix(col)));
    query.push(')');

    query.push(`WHERE ??.?? = ??.??`);
    bindings.push(tableName, strippedId, synthTable, strippedId);

    // TODO: node-pg wraps all bound values in quotes (''), which causes
    // Postgres to reject this query as it thinks we're trying to assign strings
    // to numerical columns. However, Knex properly binds numerical values,
    // so rendering to a string and then back to a raw query fixes things.
    // The "fix" here is to include ::type casts to the VALUES rows.
    // This requires us to know the exact column type for each column, however.
    // See https://github.com/tgriesser/knex/issues/1001
    const rawQuery = this._knex.raw(query.join(' '), bindings);
    return this._knex.raw(rawQuery.toString());
  }

  public del<T extends object>(table: T): Query<T, number> {
    return new Query<T, number>(
        this._registry,
        this._knex(this._registry.getTableName(table))
            .del());
  }

  /**
   * Inserts a row if not present, otherwise updates it to new values.
   *
   * @param updateStrategy For each column, specifies what to do in the case of
   *   an update.
   *
   * @returns The number of rows that were created. Computing this number
   *   requires abusing an implementation detail of Postgres; it should only be
   *   used for non-critical code paths such as logging or debugging.
   */
  public upsert<T extends object, R extends T>(
      table: T,
      row: R,
      primaryColumn: keyof T,
      updateStrategy?: UpdateStrategy<Partial<T>>,
  ): Bluebird<number> {
    return this.upsertAll(table, [row], primaryColumn, updateStrategy);
  }

  /**
   * Upserts all supplied rows.
   *
   * @param updateStrategy For each column, specifies what to do in the case of
   *   an update.
   *
   * @returns The number of rows that were created. Computing this number
   *   requires abusing an implementation detail of Postgres; it should only be
   *   used for non-critical code paths such as logging or debugging.
   */
  public upsertAll<T extends object, R extends T>(
      table: T,
      rows: R[],
      primaryColumn: keyof T,
      updateStrategy?: UpdateStrategy<Partial<T>>,
  ): Bluebird<number> {
    if (rows.length == 0) {
      return Bluebird.resolve(0);
    }

    const clientType = (this._rootKnex as any).CLIENT as string;
    const tableName = this._registry.getTableName(table);
    const colNames = Object.keys(table) as (keyof T)[];

    if (clientType == 'pg') {
      const queryArgs: any[] = [tableName];

      // Enumerate column names
      const colQs = [];
      for (let colName of colNames) {
        colQs.push('??');
        queryArgs.push(this._registry.stripPrefix(colName));
      }

      // Enumerate rows to insert
      const rowPattern = '(' + Array(colQs.length).fill('?').join(',') + ')';
      const allRowsPattern = Array(rows.length).fill(rowPattern).join(',');
      for (let row of rows) {
        // Iterate over colNames to ensure consistent column order for each row
        for (let colName of colNames) {
          queryArgs.push(row[colName]);
        }
      }

      queryArgs.push(this._registry.stripPrefix(primaryColumn));

      let updates = [];
      for (let col of colNames) {
        if (col != primaryColumn
            && (updateStrategy == undefined
                || updateStrategy[col] != UpdatePolicy.PRESERVE_EXISTING)) {
          const strippedCol = this._registry.stripPrefix(col);
          updates.push(`??=EXCLUDED.??`);
          queryArgs.push(strippedCol, strippedCol);
        }
      }

      // The last line of this query uses an obscure implementation detail of
      // Postgres to detect if a row was inserted or updated. It's very unlikely
      // for this implementation detail to change, but code should treat this
      // return as unreliable. Good for debugging or logging, but that's it.
      // See https://stackoverflow.com/questions/39058213
      const query = `INSERT INTO ?? (${colQs.join(',')})
          VALUES ${ allRowsPattern }
          ON CONFLICT(??) DO UPDATE
          SET ${updates.join(',')}
          RETURNING CASE WHEN xmax::text::int > 0 THEN 0 ELSE 1 END AS count`;

      return this._knex.raw(query, queryArgs)
      .then(response => {
        return response.rows.reduce(
            (accum: number, value: any) => accum + value.count, 0);
      });
    } else {
      throw new Error(`Client not supported: ${clientType}.`);
    }
  }

  /**
   * Upsert, but for multiple rows. Given a set of rows in a table that all
   * share the same value for a particular column, replaces those rows with a
   * new set of rows. Uses locks to ensure that concurrent calls to replace()
   * behave safely.
   *
   * @param table The table to insert the columns into.
   * @param sharedColumn The column that all rows have in common.
   * @param sharedColumnValue The column's value. This must be an integer.
   * @param rows The new rows.
   */
  // TODO: add "primary" or "principle" column annotations to Tnex so that we
  // don't have to ask what the important column in question is -- and, more
  // importantly, so we can enforce that there's only one per table.
  public replace<T extends object, K extends keyof T>(
      table: T,
      sharedColumn: K,
      sharedColumnValue: T[K] & number,
      rows: T[],
      ) {
    for (let row of rows) {
      if (row[sharedColumn] != sharedColumnValue) {
        throw new Error(
            `Column ${sharedColumn} should be ${sharedColumnValue} but is ` +
            `${row[sharedColumn]} instead. In row: ${inspect(row)}.`);
      }
    }
    return this.transaction(db => {
      return db.acquireTransactionalLock(table, sharedColumnValue)
      .then(_ => {
        return db
            .del(table)
            .where(sharedColumn, '=', val(sharedColumnValue))
            .run();
      })
      .then(_ => {
        if (rows.length > 0) {
          return db
              .insertAll(table, rows);
        }
      })
    });
  }

  /**
   * Acquires an abstract lock that will last for the duration of the current
   * transaction. If the lock has already been obtained, blocks until it is
   * free. Throws an error if called outside of a transaction.
   *
   * @param table The table that this lock represents. Note that the table
   *   itself will not actually be locked.
   * @param key A key that represents which part of the table is locked.
   */
  public acquireTransactionalLock(table: object, key: number) {
    if (key != Math.round(key)) {
      throw new Error(`key ${key} must be an integer`);
    }
    if (!this._isTransaction()) {
      throw new Error(`Must be inside a transaction.`);
    }

    if (this._getClient() == 'pg') {
      return this._knex.raw(
          `SELECT pg_advisory_xact_lock('??'::regclass::int, ?);`,
          [this._registry.getTableName(table), key])
    } else {
      throw new Error(`Unsupported client type: "${this._getClient()}".`)
    }
  }

  private _getClient() {
    return (this._rootKnex as any).CLIENT as string;
  }

  private _isTransaction() {
    return this._knex != this._rootKnex;
  }

  private _prepForInsert<T extends object>(row: T, table: T): SimpleObj {
    let tableName = this._registry.getTableName(table);

    let out = {} as SimpleObj;
    for (let key in row) {
      if (!table.hasOwnProperty(key)) {
        throw new Error(
            `Column "${key}" is not defined in table "${tableName}".`)
      }
      if (row[key] === USE_DEFAULT as any) {
        continue;
      }
      out[this._registry.stripPrefix(key)] = row[key];
    }
    return out;
  }

  private _prepReturningKeys(returning: undefined|string|string[]) {
    // TODO: Throw exception if returning is not supported by current DB.
    if (returning == undefined) {
      return returning;
    } else if (typeof returning == 'string') {
      return this._registry.stripPrefix(returning);
    } else {
      return returning.map(col => this._registry.stripPrefix(col));
    }
  }
}

export enum UpdatePolicy {
  /** Overwrite any existing value in the column. */
  OVERWRITE,
  /** If the row already exists, keep the existing value. */
  PRESERVE_EXISTING,
};

export type UpdateStrategy<T extends object> = {
  [P in keyof T]: UpdatePolicy;
}
