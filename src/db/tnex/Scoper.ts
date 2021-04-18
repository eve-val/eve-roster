import util = require("util");
import { splitColumn } from "./core";

export class Scoper {
  private _separator: string;

  private _tableToNameGlobal: Map<object, string>;

  private _prefixToNameGlobal: Map<string, string>;
  private _prefixToNameLocal = new Map<string, string>();

  public constructor(
    separator: string,
    tableToName: Map<object, string>,
    prefixToName: Map<string, string>
  ) {
    this._separator = separator;
    this._tableToNameGlobal = tableToName;
    this._prefixToNameGlobal = prefixToName;
  }

  mirror(): Scoper {
    return new Scoper(
      this._separator,
      this._tableToNameGlobal,
      this._prefixToNameGlobal
    );
  }

  scopeColumn(columnName: string, subqueryTableName?: string): string {
    const [prefix, bareColumn] = this.splitColumn(columnName);
    let tableName: string;
    if (subqueryTableName != undefined) {
      if (prefix != subqueryTableName) {
        throw new Error(
          `Column "${columnName}" must be prefixed with` +
            ` "${subqueryTableName}".`
        );
      }
      tableName = subqueryTableName;
    } else {
      const registeredTableName = this._prefixToTableName(prefix);
      if (registeredTableName == undefined) {
        throw new Error(`Unknown table prefix "${prefix}".`);
      } else {
        tableName = registeredTableName;
      }
    }
    return `${tableName}.${bareColumn}`;
  }

  getTableName(table: object): string {
    const tableName = this._tableToNameGlobal.get(table);
    if (tableName == undefined) {
      throw new Error(
        `Unknown table "${util.inspect(table)}".` +
          ` Did you forget to register it?`
      );
    }
    return tableName;
  }

  splitColumn(columnName: string): [string, string] {
    return splitColumn(columnName, this._separator);
  }

  stripPrefix(columnName: string): string {
    return this.splitColumn(columnName)[1];
  }

  registerSyntheticPrefix(prefix: string) {
    if (this._prefixToTableName(prefix) != undefined) {
      throw new Error(`Duplicate subtable definition "${prefix}".`);
    }
    this._prefixToNameLocal.set(prefix, prefix);
  }

  prefixToTableName(prefix: string): string {
    const tableName = this._prefixToTableName(prefix);
    if (tableName == undefined) {
      throw new Error(`Unknown table prefix "${prefix}".`);
    }
    return tableName;
  }

  private _prefixToTableName(prefix: string): string | undefined {
    let tableName = this._prefixToNameGlobal.get(prefix);
    if (tableName == undefined) {
      tableName = this._prefixToNameLocal.get(prefix);
    }
    return tableName;
  }
}
