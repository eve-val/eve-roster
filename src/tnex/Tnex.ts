import { inspect } from 'util';

import Bluebird = require('bluebird');
import Knex = require('knex');

import { SimpleObj, val, StringKeyOf } from './core';
import { Scoper } from './Scoper';
import { Select } from './Select';
import { Query } from './Query';
import { RenamedJoin } from './RenamedJoin';
import { Update } from './Update';
import { getColumnDescriptors, ColumnDescriptor, DataType } from './ColumnDescriptor';

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
            this._prepRowForInsert(row, table),
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
            rows.map(row => this._prepRowForInsert(row, table)),
            this._prepReturningKeys(returning));
  }

  public batchInsert<T extends Object, R extends T>(
      table: T,
      rows: T[],
      chunkSize?: number,
      ): Bluebird<number[]> {
    return this._knex.batchInsert(
        this._registry.getTableName(table),
        rows.map(row => this._prepRowForInsert(row, table)),
        chunkSize as any, // bug in typings doesn't allow undef
        );
  }

  public update<T extends object>(
    table: T,
    values: Partial<T>,
  ): Update<T, {}> {
    return new Update(
        this._knex, this._registry, table, this._prepRowForInsert(values, table));
  }

  /**
   * Updates multiple rows at once. Rows must have a unique ID column (as
   * specified in the `idColumn` parameter).
   */
  public updateAll<T extends object, K extends StringKeyOf<T>>(
      table: T,
      idColumn: K,
      rows: Array<Partial<T> & Pick<T, K>>,
  ) {
    // Query structure:
    // UPDATE tableName SET
    //     col1 = _synthTable.col1,
    //     col2 = _synthTable.col2,
    //     ...
    // FROM (VALUES (col1_value::type, col2_value::type, ...), ...))
    // AS _synthTable(col1, col2, ...)
    // WHERE _synthTable.idCol = tableName.idCol

    if (rows.length == 0) {
      throw new Error(`rows cannot be empty.`);
    }

    const tableName = this._registry.getTableName(table);
    const strippedId = this._registry.stripPrefix(idColumn);
    const synthTable = `__updatesFor_${tableName}`;
    const columns = getColumnDescriptors(table)
        .filter(col => rows[0].hasOwnProperty(col.prefixedName));

    const query: string[] = [];
    const bindings: any[] = [];

    query.push(`UPDATE ?? SET`);
    bindings.push(tableName);

    const assignmentClause: string[] = [];
    for (let col of columns) {
      if (col.prefixedName == idColumn) {
        continue;
      }
      assignmentClause.push(`?? = ??.??`);
      bindings.push(col.unprefixedName, synthTable, col.unprefixedName);
    }
    query.push(assignmentClause.join(', '));

    query.push(`FROM (VALUES`);

    const rowValues: string[] = [];
    for (let col of columns) {
      rowValues.push(`?::${col.cast}`);
    }
    const rowValueClause = `(${ rowValues.join(',') })`;

    query.push(repeat(rowValueClause, ', ', rows.length));
    for (let row of rows) {
      for (let col of columns) {
        const val = row[col.prefixedName];
        if (val == undefined) {
          throw new Error(`Column ${col.prefixedName} is undefined in row`
              + ` ${inspect(row)}.`);
        }
        bindings.push(prepValueForInsert(val, col));
      }
    }
    query.push(')');

    query.push(`AS ??(`);
    bindings.push(synthTable);
    query.push(repeat('??', ', ', columns.length));
    bindings.push(...columns.map(col => col.unprefixedName));
    query.push(')');

    query.push(`WHERE ??.?? = ??.??`);
    bindings.push(tableName, strippedId, synthTable, strippedId);

    return this._knex.raw(query.join(' '), bindings);
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
      primaryColumn: StringKeyOf<T>,
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
      primaryColumn: StringKeyOf<T>,
      updateStrategy?: UpdateStrategy<Partial<T>>,
  ): Bluebird<number> {
    if (rows.length == 0) {
      return Bluebird.resolve(0);
    }

    const clientType = (this._rootKnex as any).CLIENT as string;
    const tableName = this._registry.getTableName(table);
    const columns = getColumnDescriptors(table);

    if (clientType == 'pg') {
      const bindings: any[] = [tableName];

      // Enumerate column names
      const colQs = [];
      for (let col of columns) {
        colQs.push('??');
        bindings.push(col.unprefixedName);
      }

      // Enumerate rows to insert
      const rowPattern = '(' + repeat('?', ',', colQs.length) + ')';
      const allRowsPattern = repeat(rowPattern, ',', rows.length);
      for (let row of rows) {
        // Iterate over colNames to ensure consistent column order for each row
        for (let col of columns) {
          bindings.push(prepValueForInsert(row[col.prefixedName], col));
        }
      }

      bindings.push(this._registry.stripPrefix(primaryColumn));

      let updates = [];
      for (let col of columns) {
        if (col.prefixedName != primaryColumn
            && (updateStrategy == undefined
                || updateStrategy[col.prefixedName]
                    != UpdatePolicy.PRESERVE_EXISTING)) {
          updates.push(`??=EXCLUDED.??`);
          bindings.push(col.unprefixedName, col.unprefixedName);
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

      return this._knex.raw(query, bindings)
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
  public replace<T extends object, K extends StringKeyOf<T>>(
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

  private _prepRowForInsert<T extends object>(row: T, table: T): SimpleObj {
    let out = {} as SimpleObj;
    for (let col of getColumnDescriptors(table)) {
      const val = row[col.prefixedName];
      if (val === USE_DEFAULT as any) {
        continue;
      }
      out[col.unprefixedName] = prepValueForInsert(val, col);
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

function repeat(str: string, separator: string, count: number) {
  let out = '';
  for (let i = 0; i < count; i++) {
    out += str;
    if (i != count - 1) {
      out += separator;
    }
  }
  return out;
}

function prepValueForInsert<T extends object>(
    value: any,
    column: ColumnDescriptor<T>,
) {
  if (column.type == DataType.JSON) {
    // node-pg will auto-stringify objects passed to it, but arrays and
    // primitives don't get encoded properly, so we just stringify everything
    // here.
    return JSON.stringify(value);
  } else {
    return value;
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
