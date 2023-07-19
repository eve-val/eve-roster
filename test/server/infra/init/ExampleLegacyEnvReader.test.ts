import { expect, test } from "@jest/globals";
import { mockModule } from "../../../test_infra/mockModule.js";
import { fakeEnvModule } from "./FakeEnv.js";

// The line must appear above the ExampleEnvReader import (i.e. the class
// under tests) in order for the faking to work properly.
const fakeEnv = mockModule(
  "src/server/infra/init/Env.js",
  fakeEnvModule({
    COOKIE_SECRET: "early_secret",
  }),
);

import {
  exampleFunctionThatDependsOnEnv,
  ExampleEnvReader,
} from "../../../../src/server/infra/init/ExampleEnvReader.js";

test("New instance of reader properly gets faked values", () => {
  fakeEnv.setEnv({
    COOKIE_SECRET: "foo",
  });

  const reader = new ExampleEnvReader();

  expect(reader.getCookieSecret()).toBe("foo");
  expect(reader.getSavedCookieSecret()).toBe("early_secret");
});

test("Example global function properly reads fake hostname", () => {
  fakeEnv.setEnv({
    HOSTNAME: "some.fake.hostname",
  });

  expect(exampleFunctionThatDependsOnEnv()).toBe(
    "The hostname is some.fake.hostname",
  );
});
