import type * as EnvModule from "../../../../src/server/infra/init/Env.js";
import type { Env } from "../../../../src/server/infra/init/Env.js";

/**
 * Builds a fake version of the Env module for use in testing.
 *
 * See ExampleLegacyEnvReader.test.ts for an example of usage.
 */

export function fakeEnvModule(props: Partial<Env> = {}) {
  const fakeEnv = Object.assign({}, DEFAULT_ENV) as Writable<Env>;

  const fakeModule = {
    initEnv: () => fakeEnv,
    getEnv: () => fakeEnv,
    setEnv(props: Partial<Env>) {
      Object.assign(fakeEnv, props);
    },
  };
  fakeModule.setEnv(props);

  return impersonateModule<typeof EnvModule, typeof fakeModule>(fakeModule);
}

const DEFAULT_ENV: Env = {
  NODE_ENV: "test",
  LOG_DIR: "test_log_dir",
  COOKIE_SECRET: "test_cookie_secret",
  SSO_CLIENT_ID: "test_client_id",
  SSO_SECRET_KEY: "test_sso_secret_key",
  USER_AGENT: "test_user_agent",
  DATABASE_URL: "",
  DATABASE_HOST: "",
  DATABASE_USER: "",
  DATABASE_NAME: "",
  DATABASE_PASS: "",
  HOSTNAME: "test.example.com",
  PORT: 0,
  DOKKU_NGINX_PORT: 0,
  DOKKU_PROXY_PORT: 0,
  DOKKU_NGINX_SSL_PORT: 0,
  DOKKU_PROXY_SSL_PORT: 0,
  HONEYCOMB_API_KEY: "test_honeycomb_api_key",
  HONEYCOMB_DATASET: "test_honeycomb_dataset",
  DEBUG_GROUPS: [],
  DEBUG_DISABLE_CRON: false,
  CLIENT_DEV_MODE: false,
  isDevelopment: false,
  isDev: false,
  isTest: true,
  isProduction: true,
  isProd: true,
};

type Writable<T> = { -readonly [P in keyof T]: T[P] };

function impersonateModule<M, F extends M>(fake: F) {
  return {
    ...fake,
    __esModule: true,
  };
}
