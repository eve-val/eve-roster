/**
 * The root file of the server.
 *
 * Unusually, this file contains multiple import blocks. This structure allows
 * us time to get monitoring initialized before doing anything else (as even
 * importing code can cause side-effects that we might want to monitor).
 */

import sourceMapSupport from "source-map-support";
import { initEnv } from "./infra/init/Env.js";
import { buildLogger } from "./infra/logging/buildLogger.js";

// Causes stack traces to reference the original .ts files
sourceMapSupport.install();

const env = initEnv();
const logger = buildLogger("server");

const { initMonitoring } = await import("./infra/init/initMonitoring.js");
const { initServer } = await import("./infra/init/initServer.js");

initMonitoring(env);

// Crash the process in the face of an unhandled promise rejection
process.on("unhandledRejection", (err) => {
  if (err instanceof Error) {
    logger.error(`Unhandled promise rejection`, err);
  } else {
    logger.error(`Unhandled promise rejection: ${err}`);
  }
  throw err;
});

initServer(env).catch((e) => {
  logger.error(`Fatal error during startup.`);
  logger.error(e);
  process.exit(2);
});
