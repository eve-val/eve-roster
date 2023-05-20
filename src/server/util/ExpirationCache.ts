/**
 * A map that where each entry has a lifetime. Attempting to retrieve an entry
 * after its lifetime has expired will return undefined.
 */
export class ExpirationCache<K, V> {
  private _map = new Map<K, CacheItem<V>>();

  public set(key: K, value: V, lifetime: number) {
    const item = this._map.get(key);
    const expires = Date.now() + lifetime;
    if (!item) {
      this._map.set(key, {
        value: value,
        expires: expires,
      });
    } else {
      item.expires = expires;
      item.value = value;
    }
  }

  public get(key: K): V | undefined {
    const item = this._map.get(key);
    if (item == undefined) {
      return undefined;
    } else if (item.expires < Date.now()) {
      this._map.delete(key);
      return undefined;
    } else {
      return item.value;
    }
  }
}

interface CacheItem<V> {
  value: V;
  expires: number;
}
