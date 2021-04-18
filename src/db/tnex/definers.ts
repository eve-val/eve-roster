import { ColumnDescriptorImpl, DataType } from "./ColumnDescriptor";

export function nullable<K>(value: K): K | null {
  if (!(value instanceof ColumnDescriptorImpl)) {
    throw new Error(`Not a column descriptor.`);
  }
  value.nullable = true;

  return value;
}

export function boolean(): boolean {
  return new ColumnDescriptorImpl(DataType.BOOLEAN, "bool") as any;
}

export function varchar(): string {
  return new ColumnDescriptorImpl(DataType.VARCHAR, "varchar") as any;
}

export function text(): string {
  return new ColumnDescriptorImpl(DataType.TEXT, "text") as any;
}

export function integer(): number {
  return new ColumnDescriptorImpl(DataType.INTEGER, "int") as any;
}

export function bigInt(): number {
  return new ColumnDescriptorImpl(DataType.BIGINT, "bigint") as any;
}

export function float4(): number {
  return new ColumnDescriptorImpl(DataType.FLOAT4, "float4") as any;
}

export function float8(): number {
  return new ColumnDescriptorImpl(DataType.FLOAT8, "float8") as any;
}

export function decimal(precision: number, scale: number): number {
  return new ColumnDescriptorImpl(DataType.DECIMAL, "decimal") as any;
}

export function strEnum<K extends string>(): K {
  return new ColumnDescriptorImpl(DataType.VARCHAR, "varchar") as any;
}

export function jsonb<K>(): K {
  return new ColumnDescriptorImpl(DataType.JSON, "jsonb") as any;
}
