export type nil = null | undefined;

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
