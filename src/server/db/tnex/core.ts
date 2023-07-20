export type ColumnType = number | string | boolean | Date;

export type Comparison = "=" | "!=" | "<" | ">" | "<=" | ">=";

export enum ResultOrder {
  ASC = "asc",
  DESC = "desc",
}

/**
 * Extracts and renames a property of T.
 *
 * Given a type T and a key of T, K, creates a new type with a single
 * property named L that has type T[K].
 */
export type Link<T, K extends keyof T, L extends string> = {
  [P in L]: T[K];
};

/**
 * All of the string keys of a type. Essentially `keyof <type>` but only
 * includes the string keys.
 *
 * Since TS 2.9, `keyof <type>` has a type of `string | number | Symbol`. Tnex
 * only works on string properties; this allows those functions to restrict
 * their parameters to only accept string properties.
 */
export type StringKeyOf<T> = Extract<keyof T, string>;

/**
 * Given a type, makes all properties AND subproperties optional.
 */
export type DeepPartial<T> = {
  [P in keyof T]?: T[P] extends any[]
    ? T[P]
    : T[P] extends object
    ? DeepPartial<T[P]>
    : T[P];
};

export type SimpleObj = Record<string, any>;

export type Nullable<T> = {
  [P in keyof T]: T[P] | null;
};

export class ValueWrapper<T extends ColumnType> {
  constructor(public value: T) {}
}

export function splitColumn(
  columnName: string,
  separator: string,
): [string, string] {
  const split = columnName.split(separator);
  if (split.length != 2 || split[0].length == 0) {
    throw new Error(`Column ${columnName} is missing a table prefix.`);
  }
  return split as [string, string];
}

export function val<T extends ColumnType>(value: T) {
  return new ValueWrapper(value);
}
