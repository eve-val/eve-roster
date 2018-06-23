export type nil = null | undefined;

export type Nullable<T>  = {
  [P in keyof T]: T[P] | null
};

/**
 * Like ReturnType, but for functions that return promises. Obtains the type
 * of the promised value.
 */
export type AsyncReturnType<T extends (...args: any[]) => Promise<any>> =
    T extends (...args: any[]) => Promise<infer R> ? R : T;

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
