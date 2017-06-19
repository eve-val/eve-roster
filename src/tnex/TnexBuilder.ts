import Promise = require('bluebird');
import Knex = require('knex');

import util = require('util');
import { splitColumn } from './core';
import { Tnex } from './Tnex';
import { Scoper } from './Scoper';

export class TnexBuilder {
  private _separator: string;
  private _tableNameSupplier: (constructorName: string) => string;

  private _registeredNames = new Set<string>();
  private _tableToName = new Map<object, string>();
  private _prefixToName = new Map<string, string>();

  constructor(prefixSeparator = '_', tableNameSupplier = lowerCaseFirstLetter) {
    this._separator = prefixSeparator;
    this._tableNameSupplier = tableNameSupplier;
  }

  /**
   * @param table An object representing a table. Should be an instance of a
   *    class.
   * @param tableName The name of the table in your database. If not provided,
   *    Tnex will infer a table name from the name of the object's
   *    constructor. The default is to lower-case the first letter of the
   *    constructor's name, but this behavior can be customized in
   *    TnexBuilder's constructor.
   */
  public register<T extends object>(table: T, tableName?: string): T {
    if (tableName == undefined) {
      if (!table.constructor) {
        throw new Error(
            `No table name provided and table doesn't have a constructor to`
                + ` infer a name from.`);
      }
      tableName = this._tableNameSupplier(table.constructor.name);
    }

    if (this._registeredNames.has(tableName)) {
      throw new Error(`Duplicate table definition for table "${tableName}".`);
    }

    let tablePrefix: string | null = null;
    for (let p in table) {
      let [prefix] = splitColumn(p, this._separator);

      if (tablePrefix == null) {
        tablePrefix = prefix;
      } else {
        if (prefix != tablePrefix) {
          throw new Error(
              `Inconsistent prefixing in table "${tableName}".`
                  + `Column "${p}" doesn't match inferred prefix`
                  + ` "${tablePrefix}".`);
        }
      }
    }
    if (tablePrefix == null) {
      throw new Error(
          `Table ${util.inspect(table)} must declare at least one column.`);
    }
    this._registeredNames.add(tableName);
    this._tableToName.set(table, tableName);
    this._prefixToName.set(tablePrefix, tableName);
    
    return table;
  }

  public build(knex: Knex): Tnex {
    return new Tnex(
        knex,
        new Scoper(
            this._separator,
            this._tableToName,
            this._prefixToName),
        knex,
    );
  }
}

function lowerCaseFirstLetter(constructorName: string) {
  return constructorName[0].toLocaleLowerCase() + constructorName.substr(1);
}