import { inspect } from 'util';

import Bluebird = require('bluebird');
import Knex = require('knex');

import { ValueWrapper, ColumnType, SimpleObj, val } from './core';
import { Scoper } from './Scoper';
import { Joiner } from './Joiner';
import { Query } from './Query';
import { RenamedJoin } from './RenamedJoin';

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

  public select<T extends object>(table: T): Joiner<T, {}> {
    return new Joiner<T, {}>(this._knex, this._registry, table);
  }

  public subselect<T extends object>(startingTable: T, asTableName: string) {
    return new Joiner<T, {}>(
        this._knex,
        this._registry,
        startingTable,
        asTableName);
  }

  public alias<T extends object>(table: T, alias: string): RenamedJoin<T, {}> {
    return new RenamedJoin(table, alias, this._registry);
  }

  public val<T extends ColumnType>(value: T) {
    return new ValueWrapper(value);
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
    ): Query<T, number> {

    return new Query<T, number>(
        this._registry,
        this._knex(this._registry.getTableName(table))
            .update(this._prepForInsert(values, table)),
        true);
  }

  public del<T extends object>(table: T): Query<T, number> {
    return new Query<T, number>(
        this._registry,
        this._knex(this._registry.getTableName(table))
            .del(),
        true);
  }

  public upsert<T extends object, R extends T>(
      table: T, row: R, primaryColumn: keyof T): Bluebird<void> {
    let clientType = (this._rootKnex as any).CLIENT as string;

    let tableName = this._registry.getTableName(table);
    let strippedPrimary = this._registry.stripPrefix(primaryColumn);
    let strippedRow = this._prepForInsert(row, table);

    if (clientType == 'sqlite3') {
      // Manually convert booleans to 0/1 for sqlite
      for (let v in strippedRow) {
        let val = strippedRow[v];
        if (typeof val == 'boolean') {
          strippedRow[v] = val ? 1 : 0;
        }
      }

      return this._knex(tableName)
          .update(strippedRow)
          .where(strippedPrimary, '=', strippedRow[strippedPrimary])
      .then(() => {
        let rawQuery = this._knex(tableName)
            .insert(strippedRow)
            .toString()
            .replace(/^insert/i, 'insert or ignore');

        return this._knex.raw(rawQuery);
      });

    } else if (clientType == 'pg') {
      let strippedCols = Object.keys(strippedRow);
      let data = [tableName];

      let colQs = [];
      for (let colName of strippedCols) {
        colQs.push('??');
        data.push(colName);
      }

      let valQs = [];
      for (let colName of strippedCols) {
        valQs.push('?');
        data.push(strippedRow[colName]);
      }

      data.push(strippedPrimary);

      let updates = [];
      for (let colName of strippedCols) {
        if (colName != strippedPrimary) {
          updates.push(`??=EXCLUDED.??`);
          data.push(colName, colName);
        }
      }

      let query = `INSERT INTO ?? (${colQs.join(',')})
          VALUES(${valQs.join(',')})
          ON CONFLICT(??) DO UPDATE
          SET ${updates.join(',')}`;

      return this._knex.raw(query, data);

    } else {
      console.log(this._knex);
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
      if (row[key] === USE_DEFAULT) {
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
