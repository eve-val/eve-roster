import { PropType } from "vue";
import { inEnum } from "../../shared/util/enum";

export type EnumProp<T extends string> = `${T}`;

export function enumProp<T extends StringEnum>(
  enumType: T,
  defaultValue: T[keyof T]
) {
  return {
    type: String as PropType<EnumProp<T[keyof T]>>,
    default: defaultValue,
    validator: (value: string) => inEnum(value, enumType),
  };
}

export function requiredEnumProp<T extends StringEnum>(
  enumType: T,
  defaultValue: T[keyof T]
) {
  return {
    type: String as PropType<EnumProp<T[keyof T]>>,
    default: defaultValue,
    required: true as const,
    validator: (value: string) => inEnum(value, enumType),
  };
}

type StringEnum = {
  [key: string]: string;
};
