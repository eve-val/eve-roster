export function assertHasValue<T>(value: T | null | undefined): T {
  if (value == undefined) {
    throw new Error('Value cannot be null or undefined.');
  }
  return value;
}

export const notNil = assertHasValue;
