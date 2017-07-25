export type ColumnType = number | string | boolean | Date;

export type Comparison = '=' | '!=' | '<' | '>' | '<=' | '>=';

export type Link<T, K extends keyof T, L extends string> = {
  [P in L]: T[K]
};

export type SimpleObj = {
  [key: string]: any
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
