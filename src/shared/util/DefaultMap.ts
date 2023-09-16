import { nil } from "./simpleTypes.js";

export class DefaultMap<K, V> extends Map<K, V> {
  constructor(producer: (key: K) => V);
  constructor(
    producer: (key: K) => V,
    iterable?: Iterable<readonly [K, V]> | nil,
  );
  constructor(
    producer: (key: K) => V,
    entries: readonly (readonly [K, V])[] | nil,
  );
  constructor(
    private producer: (key: K) => V,
    iterableOrEntries?:
      | Iterable<readonly [K, V]>
      | readonly (readonly [K, V])[]
      | nil,
  ) {
    super(iterableOrEntries);
  }

  getOrInit(key: K): V {
    let value = super.get(key);
    if (value === undefined) {
      value = this.producer(key);
      this.set(key, value);
    }
    return value;
  }
}
