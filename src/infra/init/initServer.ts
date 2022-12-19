import { default as axios } from "axios";

import { tables } from "../../db/tables.js";
import { getPostgresKnex } from "../../db/getPostgresKnex.js";
import * as express from "../express/express.js";
import * as cron from "../taskrunner/cron.js";
import * as taskRunner from "../taskrunner/taskRunner.js";
import * as sde from "../../eve/sde.js";
import { Agent } from "https";
import { buildLogger } from "../logging/buildLogger.js";
import { Env } from "./Env.js";

const logger = buildLogger("initServer");

export async function initServer(env: Env) {
  const db = tables.build(getPostgresKnex(env));

  await sde.loadStaticData(db, false);

  configureAxios(env);
  taskRunner.init(db);
  cron.init(db, env);
  express.init(db, env, (port) => {
    logger.info(`Serving from port ${port}.`);
  });
}

function configureAxios(env: Env) {
  axios.defaults.headers["User-Agent"] = env.USER_AGENT;
  axios.defaults.httpsAgent = new Agent({
    keepAlive: true,
    maxVersion: "TLSv1.3",
    minVersion: "TLSv1.2",
  });
}
