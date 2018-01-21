export type nil = null | undefined;

export type Nullable<T>  = {
  [P in keyof T]: T[P] | null
};

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
