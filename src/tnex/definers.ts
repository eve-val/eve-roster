export function nullable<K>(value: K): K | null {
  return value;
}

export function string(): string {
  return '';
}

export function number(): number {
  return 0;
}

export function boolean(): boolean {
  return false;
}

// For DBs that use numbers instead of booleans (such as SQLite)
export function boolinum(): number {
  return 0;
}

export function enu<K extends string>(): K {
  return '' as K;
}

export function json<K extends object>(): K {
  return {} as K;
}
