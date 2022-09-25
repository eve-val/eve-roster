import { bool, cleanEnv, makeValidator, str } from "envalid";

export function initEnv() {
  return cleanEnv(process.env, {
    // Must be set manually in all environments
    COOKIE_SECRET: str(),
    SSO_CLIENT_ID: str(),
    SSO_SECRET_KEY: str(),
    USER_AGENT: str(),

    // Either DATABASE_URL or the other four must be set
    DATABASE_URL: str({ default: undefined }),
    DATABASE_HOST: str({ default: undefined }),
    DATABASE_USER: str({ default: undefined }),
    DATABASE_NAME: str({ default: undefined }),
    DATABASE_PASS: str({ default: undefined }),

    // Stuff that's primarily intended to be set in production
    HOSTNAME: str({ devDefault: "localhost" }),
    PORT: int({ devDefault: 8081 }),

    DOKKU_NGINX_PORT: int({ default: undefined }),
    DOKKU_PROXY_PORT: int({ default: undefined }),
    DOKKU_NGINX_SSL_PORT: int({ default: undefined }),
    DOKKU_PROXY_SSL_PORT: int({ default: undefined }),

    HONEYCOMB_API_KEY: str({ devDefault: "" }),
    HONEYCOMB_DATASET: str({ devDefault: "" }),

    // Debugging flags
    DEBUG_GROUPS: jsonDebugGroups({ default: undefined }),
    DEBUG_DISABLE_CRON: bool({ default: false }),
  });
}

export type Env = ReturnType<typeof initEnv>;

const int = makeValidator((input) => {
  const value = parseInt(input);
  if (isNaN(value)) {
    throw new Error(`Not a valid number`);
  }
  return value;
});

const jsonDebugGroups = makeValidator((input) => {
  const value = JSON.parse(input);

  if (!(value instanceof Array)) {
    throw new Error(`Not a JSON array`);
  }
  for (const elem of value) {
    if (typeof elem != "string") {
      throw new Error(`Value must be a string "${elem}"`);
    }
  }

  return value;
});
