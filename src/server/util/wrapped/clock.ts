/**
 * A wrapper around Date.now() that can be mocked in tests.
 */
export const clock = {
  now() {
    return Date.now();
  },
};
