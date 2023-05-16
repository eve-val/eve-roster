export { TnexBuilder } from "./TnexBuilder.js";

export { val, ResultOrder } from "./core.js";
export { Tnex, UpdatePolicy, UpdateStrategy } from "./Tnex.js";
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
} from "./definers.js";

export { DEFAULT_NUM, DEFAULT_STR, DEFAULT_BOOL } from "./Tnex.js";

export function toNum(bool: boolean) {
  return bool ? 1 : 0;
}
