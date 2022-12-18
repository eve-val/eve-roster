import { expect, test } from "@jest/globals";
import { mockModule } from "../../test_infra/mockModule";
import { fakeEnvModule } from "./FakeEnv";

// The line must appear above the ExampleLegacyEnvReader import (i.e. the class
// under tests) in order for the faking to work properly.
const fakeEnv = mockModule(
  "src/infra/init/Env.js",
  fakeEnvModule({
    COOKIE_SECRET: "early_secret",
  })
);

import {
  exampleFunctionThatDependsOnLegacyEnv,
  ExampleLegacyEnvReader,
} from "../../../src/infra/init/ExampleLegacyEnvReader.js";

test("New instance of reader properly gets faked values", () => {
  fakeEnv.setEnv({
    COOKIE_SECRET: "foo",
  });

  const reader = new ExampleLegacyEnvReader();

  expect(reader.getCookieSecret()).toBe("foo");
  expect(reader.getSavedCookieSecret()).toBe("early_secret");
});

test("Example global function properly reads fake hostname", () => {
  fakeEnv.setEnv({
    HOSTNAME: "some.fake.hostname",
  });

  expect(exampleFunctionThatDependsOnLegacyEnv()).toBe(
    "The hostname is some.fake.hostname"
  );
});
