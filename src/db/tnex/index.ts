export { TnexBuilder } from "./TnexBuilder";

export { val, ResultOrder } from "./core";
export { Tnex, UpdatePolicy, UpdateStrategy } from "./Tnex";
export {
  nullable,
  boolean,
  varchar,
  text,
  integer,
  bigInt,
  float4,
  float8,
  decimal,
  jsonb,
  strEnum,
} from "./definers";

export { DEFAULT_NUM, DEFAULT_STR, DEFAULT_BOOL } from "./Tnex";

export function toNum(bool: boolean) {
  return bool ? 1 : 0;
}
