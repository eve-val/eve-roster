import { Resolvable } from "../../../../src/server/util/async/Resolvable.js";

export function delay<T>(duration: number, producer: () => T): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    setTimeout(() => {
      let result;
      try {
        result = producer();
      } catch (e) {
        reject(e);
        return;
      }
      resolve(result);
    }, duration);
  });
}

export function post<T>(producer: () => T) {
  return new Promise<T>((resolve, reject) => {
    let result;
    try {
      result = producer();
    } catch (e) {
      reject(e);
      return;
    }
    resolve(result);
  });
}

export function nextMicrotask() {
  return new Promise<void>((resolve) => {
    queueMicrotask(resolve);
  });
}

export function latch<T>(): Latch<T> {
  let storedValue: { value: T; resolvable: Resolvable<T> } | null = null;
  let awaitedValue: { value: T; resolvable: Resolvable<void> } | null = null;

  return {
    store: (value: T) => {
      if (storedValue != null) {
        throw new Error("Received a value while still processing a value");
      }

      const resolvable = new Resolvable<T>();

      storedValue = {
        value,
        resolvable,
      };

      if (awaitedValue != null) {
        if (awaitedValue.value == value) {
          awaitedValue.resolvable.resolve();
          awaitedValue = null;
        } else {
          storedValue.resolvable.resolve(storedValue.value);
          storedValue = null;
        }
      }

      return resolvable.promise;
    },

    release() {
      if (storedValue == null) {
        throw new Error("No value to resolve");
      }
      storedValue.resolvable.resolve(storedValue.value);
      storedValue = null;
    },

    value() {
      return storedValue?.value ?? null;
    },

    hasValue() {
      return storedValue != null;
    },

    waitForValue(value: T) {
      awaitedValue = { value, resolvable: new Resolvable<void>() };
      return awaitedValue.resolvable.promise;
    },
  };
}

export interface Latch<T> {
  store(value: T): Promise<T>;
  release(): void;
  value(): T | null;
  hasValue(): boolean;
  waitForValue(value: T): Promise<void>;
}

export function latchedTransform<T>() {
  let pendingValue: { value: T; resolvable: Resolvable<T> } | null = null;

  return {
    transformer: (value: T): Promise<T> => {
      pendingValue = {
        value,
        resolvable: new Resolvable<T>(),
      };
      return pendingValue.resolvable.promise;
    },

    release(value?: T) {
      if (pendingValue == null) {
        throw new Error(`No pending value to release`);
      }
      if (value !== undefined && pendingValue.value != value) {
        throw new Error(`Pending value is ${pendingValue.value} not ${value}`);
      }
      pendingValue.resolvable.resolve(pendingValue.value);
      pendingValue = null;
    },
  };
}
