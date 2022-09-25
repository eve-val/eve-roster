/**
 * The root file of the server.
 *
 * Unusually, this file contains multiple import blocks. This structure allows
 * us time to get monitoring initialized before doing anything else (as even
 * importing code can cause side-effects that we might want to monitor).
 */

import sourceMapSupport from "source-map-support";
import { initEnv } from "./infra/init/Env.js";
import { initMonitoring } from "./infra/init/initMonitoring.js";

// Causes stack traces to reference the original .ts files
sourceMapSupport.install();

const env = initEnv();
initMonitoring(env);

import { buildLogger } from "./infra/logging/buildLogger.js";
import { initServer } from "./infra/init/initServer.js";
// Adds support for taking heapdumps when the process receives the USR2 signal
// See https://github.com/eve-val/eve-roster/wiki/Grabbing-a-heap-dump
import "heapdump";

const logger = buildLogger("server");

// Crash the process in the face of an unhandled promise rejection
process.on("unhandledRejection", (err) => {
  if (err instanceof Error) {
    logger.error(`Unhandled promise rejection`, err);
  } else {
    logger.error(`Unhandled promise rejection: ${err}`);
  }
  throw err;
});

initServer().catch((e) => {
  logger.error(`Fatal error during startup.`);
  logger.error(e);
  process.exit(2);
});
