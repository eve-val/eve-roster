import { ColumnType, ValueWrapper } from './core';
import { Tnex } from './Tnex';


export { TnexBuilder } from './TnexBuilder';

export { Tnex } from './Tnex';
export { Nullable } from './Joiner';
export { nullable, number, string, boolean, boolinum, enu } from './definers';

export {
  DEFAULT_NUM,
  DEFAULT_STR,
  DEFAULT_BOOL,
} from './Tnex';

export function toNum(bool: boolean) {
  return bool ? 1 : 0;
}

export function val<T extends ColumnType>(value: T) {
  return new ValueWrapper(value);
}
