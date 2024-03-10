import * as clockModule from "../../../../../src/server/util/wrapped/clock.js";
import { mockModule } from "../../../../test_infra/mockModule.js";

export function mockClock() {
  let now = 0;

  const fakeModule = {
    clock: {
      now() {
        return now;
      },

      setNow(time: number) {
        now = time;
      },
    },
  };

  mockModule<typeof clockModule>(
    "src/server/util/wrapped/clock.js",
    fakeModule,
  );

  return fakeModule.clock;
}
