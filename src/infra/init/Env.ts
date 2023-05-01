import path from "path";
import { bool, cleanEnv, makeValidator, str } from "envalid";
import { getRootPath } from "../../bin/witness/getRootPath.js";

let cachedEnv: Env | null = null;

/**
 * Parses the process's environment variables and encapsulates them into an
 * instance of [Env] that can be accessed via a call to [getEnv()].
 *
 * Because [getEnv()] can (and probably will) be accessed at import-time, it's
 * important to run [initEnv()] _before_ most of the program's import statements
 * have executed. This is generally achieved by setting up env (and other
 * process-level things) in the root code file and only after that has been
 * completely, dynamically-import the rest of the codebase via
 * `await import("...")`.
 */
export function initEnv() {
  const env = cleanEnv(process.env, {
    /**
     * If set to "development", enables enhanced logging and debuggable
     * behavior. Many development-focused flags lower in this file also require
     * development mode in order to function.
     */
    NODE_ENV: str({
      choices: ["production", "development", "test"],
      default: "production",
    }),

    /**
     * The directory to store runtime logs, both in production and development.
     */
    LOG_DIR: str({ default: path.join(getRootPath(), "logs") }),

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
    DEBUG_GROUPS: jsonDebugGroups({ default: [] }),
    DEBUG_DISABLE_CRON: bool({ default: false }),

    /**
     * If true, dev server and hot reloading will be enabled for the frontend
     * client. If false, you must build the client before starting the server.
     */
    CLIENT_DEV_MODE: bool({ default: false }),
  });

  if (cachedEnv != null) {
    throw new Error(`Env has already been initialized`);
  }
  cachedEnv = env;

  return env;
}

export type Env = ReturnType<typeof initEnv>;

/**
 * Call this method to access the env instance.
 */
export function getEnv() {
  if (cachedEnv == null) {
    throw new Error(`Env hasn't been initialized yet`);
  }
  return cachedEnv;
}

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
      throw new Error(`Value must be a string: "${elem}"`);
    }
  }

  return value as string[];
});
