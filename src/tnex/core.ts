export type ColumnType = number | string | boolean | Date;

export type Comparison = '=' | '!=' | '<' | '>' | '<=' | '>=';

export enum ResultOrder {
  ASC = 'asc',
  DESC = 'desc',
}

/**
 * Extracts and renames a property of T.
 *
 * Given a type T and a key of T, K, creates a new type with a single
 * property named L that has type T[K].
 */
export type Link<T, K extends keyof T, L extends string> = {
  [P in L]: T[K]
};

export type SimpleObj = {
  [key: string]: any
};

export type Nullable<T>  = {
  [P in keyof T]: T[P] | null
};

export class ValueWrapper<T extends ColumnType> {
  constructor(
      public value: T,
      ) {}
}

export function splitColumn(
    columnName: string, separator: string): [string, string] {
  let split = columnName.split(separator);
  if (split.length != 2 || split[0].length == 0) {
    throw new Error(`Column ${columnName} is missing a table prefix.`)
  }
  return split as [string, string];
}

export function val<T extends ColumnType>(value: T) {
  return new ValueWrapper(value);
}
