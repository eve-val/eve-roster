
/**
 * Internal data structure that tracks information related to table columns.
 */
export interface ColumnDescriptor<T extends Object> {
  readonly prefixedName: keyof T,
  readonly unprefixedName: string,
  readonly type: DataType,
  readonly cast: string,
  readonly nullable: boolean,
}

export enum DataType {
  BOOLEAN,

  VARCHAR,
  TEXT,

  INTEGER,
  BIGINT,
  FLOAT4,
  FLOAT8,
  DECIMAL,

  JSON,
}

export class ColumnDescriptorImpl<T extends object>
    implements ColumnDescriptor<T> {
  public prefixedName!: keyof T;
  public unprefixedName!: string;
  public type: DataType;
  public cast: string;
  public nullable = false;

  public constructor(type: DataType, cast: string) {
    this.type = type;
    this.cast = cast;
  }
}

export function getColumnDescriptors<T extends object>(
    table: T,
): ColumnDescriptor<T>[] {
  return Object.values(table);
}
