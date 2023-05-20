/**
 * Returns true if [value] is contained within [enumType].
 */
export function inEnum<T extends StringEnum>(
  value: string,
  enumType: T
): boolean {
  return findEnumValue(value, enumType, (foundValue) => foundValue != null);
}

/**
 * If [value] is contained in [enumType], returns it. Otherwise returns
 * [defaultVal].
 */
export function coerceToEnum<T extends StringEnum>(
  value: string,
  enumType: T,
  defaultVal: T[keyof T]
): T[keyof T] {
  return findEnumValue(value, enumType, (foundValue) =>
    foundValue != null ? foundValue : defaultVal
  );
}

function findEnumValue<T extends StringEnum, R>(
  value: string,
  enumType: T,
  processor: (value: T[keyof T] | null) => R
) {
  for (const key in enumType) {
    if (enumType[key] == value) {
      return processor(value as T[keyof T]);
    }
  }
  return processor(null);
}

type StringEnum = {
  [key: string]: string;
};
