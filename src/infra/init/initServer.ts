import { default as axios } from "axios";

import { tables } from "../../db/tables.js";
import { getPostgresKnex } from "../../db/getPostgresKnex.js";
import * as express from "../express/express.js";
import * as cron from "../taskrunner/cron.js";
import * as taskRunner from "../taskrunner/taskRunner.js";
import * as sde from "../../eve/sde.js";
import { Agent } from "https";
import { buildLogger } from "../logging/buildLogger.js";

const logger = buildLogger("initServer");

export async function initServer() {
  const db = tables.build(getPostgresKnex());

  await sde.loadStaticData(db, false);

  configureAxios();
  taskRunner.init(db);
  cron.init(db);
  express.init(db, (port) => {
    logger.info(`Serving from port ${port}.`);
  });
}

function configureAxios() {
  axios.defaults.headers["User-Agent"] =
    process.env.USER_AGENT || "SOUND Roster (roster.of-sound-mind.com)";
  axios.defaults.httpsAgent = new Agent({
    keepAlive: true,
    maxVersion: "TLSv1.3",
    minVersion: "TLSv1.2",
  });
}
