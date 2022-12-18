export function wrapModule<M>(fakeModule: M) {
  return {
    ...fakeModule,
    __esModule: true,
  };
}
