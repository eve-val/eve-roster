export type nil = null | undefined;

export type Nullable<T>  = {
  [P in keyof T]: T[P] | null
};

/**
 * Like ReturnType, but for functions that return promises. Obtains the type
 * of the promised value.
 */
export type AsyncReturnType<T extends (...args: any[]) => PromiseLike<any>> =
    T extends (...args: any[]) => PromiseLike<infer R> ? R : T;

export type BasicType = number | boolean | string | object;

export type SimpleMap<T> = {
  [key: string]: T,
}

export type SimpleNumMap<T> = {
  [key: number]: T
}

export type MixedObject = {
  [key: string]: BasicType
}

/** Given a type T, extracts all keys K where T[K] extends PropType. */
export type KeysOfType<T, PropType> = {
  [K in keyof T]: T[K] extends PropType ? K : never
}[keyof T];

/** Given a type T, filters out all properties whose type is not PropType. */
export type FilterProps<T, PropType> = Pick<T, KeysOfType<T, PropType>>;
