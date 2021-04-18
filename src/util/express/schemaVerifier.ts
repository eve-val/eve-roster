import { ExtendableError } from "../../error/ExtendableError";

/**
 * Example:
 *
 * verify(req.body, object('required', {
 *  id: string('required'),
 *  joinDate: number('required')
 *  props: object('optional', {
 *    flux: number('optional'),
 *    blinx: string('required'),
 *    quix: array('required', 'string'),
 *  }),
 * }))
 */

export type Requirement = "required" | "optional";
export type SchemaType = number | string | boolean | object;

export type SimpleMap<T> = {
  [key: string]: T;
};

type PrimitiveType = "string" | "number" | "boolean" | "object";

export function verify<T extends object>(data: SchemaType, schema: T): T {
  if (schema instanceof Array) {
    throw new Error(`Root-level array schemas are not yet supported.`);
  }
  new ObjectSchema(schema).verify(data, []);
  return data as any;
}

export function optional<T>(schema: T): T | undefined {
  if (!(schema instanceof Schema)) {
    throw new Error(
      `Not a valid schema.` +
        ` You must use the schema-specifying functions like string().`
    );
  }
  schema.optional = true;
  return schema as any;
}

export function nullable<T>(schema: T): T | null {
  if (!(schema instanceof Schema)) {
    throw new Error(
      `Not a valid schema.` +
        ` You must use the schema-specifying functions like string().`
    );
  }
  schema.nullable = true;
  return schema as any;
}

export function string(): string {
  return new Schema("string") as any;
}

export function number(): number {
  return new Schema("number") as any;
}

export function boolean(): boolean {
  return new Schema("boolean") as any;
}

export function stringEnum<E extends string>(enu: object): E {
  return new StringEnumSchema(enu) as any;
}

export function object<T extends object>(schema: T): T {
  return new ObjectSchema(schema) as any;
}

export function simpleMap<T>(schema: T): SimpleMap<T> {
  if (!(schema instanceof Schema)) {
    throw new Error(
      `Not a valid schema.` +
        ` You must use the schema-specifying functions like string().`
    );
  }
  return new SimpleMapSchema(schema) as any;
}

export function array<T>(schema: T): T[] {
  const primType = typeof schema;
  let subSchema;
  switch (primType) {
    case "object":
      if (schema instanceof Array) {
        throw new Error(`Subarray must be wrapped in a call to array().`);
      }
      subSchema = new ObjectSchema(schema as any);
      break;
    case "number":
    case "string":
    case "boolean":
      subSchema = new Schema(primType);
      break;
    default:
      throw new Error(`Unsupported type "${primType}".`);
  }

  return new ArraySchema(subSchema) as any;
}

class Schema {
  public primitiveType: string;
  public optional = false;
  public nullable = false;

  constructor(primitiveType: PrimitiveType) {
    this.primitiveType = primitiveType;
  }

  verify(value: any, path: string[]) {
    if (value === undefined && this.optional) {
      return;
    }

    if (value === undefined && !this.optional) {
      throw new SchemaVerificationError(
        `Property ${pathToStr(path)} is required.`
      );
    }
    if (value === null && !this.nullable) {
      throw new SchemaVerificationError(
        `Property ${pathToStr(path)} cannot be null.`
      );
    }

    if (
      typeof value != this.primitiveType &&
      value !== undefined &&
      value !== null
    ) {
      throw new SchemaVerificationError(
        `Bad type for ${pathToStr(path)}. Expected "${this.primitiveType}"` +
          ` but got "${typeof value}".`
      );
    }
  }
}

class StringEnumSchema<T extends object> extends Schema {
  constructor(private enu: T) {
    super("string");
  }

  verify(value: any, path: string[]) {
    super.verify(value, path);

    if (value == undefined) {
      // Whether this is allowed has already been checked by the super call.
      return;
    }

    if (!this.isValueDefinedInEnum(value)) {
      throw new SchemaVerificationError(
        `Value "${value}" for ${pathToStr(path)} does not match any enum` +
          ` values.`
      );
    }
  }

  private isValueDefinedInEnum(s: string) {
    for (const v in this.enu) {
      if (s === (this.enu[v] as any)) {
        return true;
      }
    }
    return false;
  }
}

class ObjectSchema<T extends object> extends Schema {
  constructor(private _subSchema: T) {
    super("object");
  }

  verify(value: any, path: string[]) {
    super.verify(value, path);

    if (value == undefined) {
      // Whether this is allowed has already been checked by the super call.
      return;
    }

    path.push("");
    for (const k in this._subSchema) {
      const prop = extractPropSchema(this._subSchema, k, path);
      path[path.length - 1] = k;
      prop.verify(value[k], path);

      if (value[k] === null) {
        // Our schema only allows defining partial, not nullable, properties,
        // so ensure that the returned value matches the returned type.
        delete value[k];
      }
    }
    path.pop();

    for (const k in value) {
      if (!this._subSchema.hasOwnProperty(k)) {
        path.push(k);
        throw new SchemaVerificationError(
          `Unexpected property: ${pathToStr(path)}`
        );
      }
    }
  }
}

class ArraySchema extends Schema {
  constructor(private _subSchema: Schema) {
    super("object");
  }

  verify(value: any, path: string[]) {
    super.verify(value, path);

    if (value == undefined) {
      // Whether this is allowed has already been checked by the super call.
      return;
    }

    if (!(value instanceof Array)) {
      throw new SchemaVerificationError(
        `Property ${pathToStr(path)} must be an array.`
      );
    }

    path.push("0");
    for (let i = 0; i < value.length; i++) {
      path[path.length - 1] = i.toString();
      this._subSchema.verify(value[i], path);
    }
    path.pop();
  }
}

class SimpleMapSchema extends Schema {
  constructor(private _subSchema: Schema) {
    super("object");
  }

  verify(value: any, path: string[]) {
    super.verify(value, path);
    path.push("");
    for (const k in value) {
      path[path.length - 1] = k;
      this._subSchema.verify(value[k], path);
    }
    path.pop();
  }
}

function extractPropSchema(
  schema: Object,
  key: string | number,
  path: string[]
): Schema {
  const prop: Schema = (schema as any)[key];
  if (!(prop instanceof Schema)) {
    path.push(key.toString());
    throw new Error(
      `Invalid schema specification at ${pathToStr(path)}.` +
        ` You must use the schema-specifying functions like string().`
    );
  }
  return prop;
}

function pathToStr(path: string[]) {
  return path.join(".");
}

export class SchemaVerificationError extends ExtendableError {}
