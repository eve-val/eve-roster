export { TnexBuilder } from './TnexBuilder';

export { val, ResultOrder, } from './core';
export { Tnex } from './Tnex';
export { Nullable } from './Joiner';
export { nullable, number, string, boolean, boolinum, enu, json } from './definers';

export {
  DEFAULT_NUM,
  DEFAULT_STR,
  DEFAULT_BOOL,
} from './Tnex';

export function toNum(bool: boolean) {
  return bool ? 1 : 0;
}
