export function nullable<K>(value: K): K | null {
  if (!(value instanceof ColumnDescriptor)) {
    throw new Error(`Not a column descriptor.`);
  }
  value.nullable = true;

  return value;
}

export function boolean(): boolean {
  return new ColumnDescriptor(DataType.BOOLEAN, 'bool') as any;
}

export function varchar(): string {
  return new ColumnDescriptor(DataType.VARCHAR, 'varchar') as any;
}

export function text(): string {
  return new ColumnDescriptor(DataType.TEXT, 'text') as any;
}

export function integer(): number {
  return new ColumnDescriptor(DataType.INTEGER, 'int') as any;
}

export function bigInt(): number {
  return new ColumnDescriptor(DataType.BIGINT, 'bigint') as any;
}

export function float4(): number {
  return new ColumnDescriptor(DataType.FLOAT4, 'float4') as any;
}

export function float8(): number {
  return new ColumnDescriptor(DataType.FLOAT8, 'float8') as any;
}

export function decimal(precision: number, scale: number): number {
  return new ColumnDescriptor(DataType.DECIMAL, 'decimal') as any;
}

export function strEnum<K extends string>(): K {
  return new ColumnDescriptor(DataType.VARCHAR, 'varchar') as any;
}

export function jsonb<K>(): K {
  return new ColumnDescriptor(DataType.JSON, 'jsonb') as any;
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

export class ColumnDescriptor {
  public readonly type: DataType;
  public readonly cast: string;
  public nullable = false;

  public constructor(type: DataType, cast: string) {
    this.type = type;
    this.cast = cast;
  }
}

export function getColumnDescriptor(col: any) {
  if (col instanceof ColumnDescriptor) {
    return col;
  } else {
    throw new Error(`Col ${JSON.stringify(col)} is not a ColumnDescriptor.`);
  }
}
