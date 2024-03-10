export function flushPromises() {
  return new Promise(process.nextTick);
}
