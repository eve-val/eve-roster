// Causes stack traces to reference the original .ts files
import "source-map-support/register";

require("heapdump");

import Graceful from "node-graceful";
Graceful.captureExceptions = true;

import { tables } from "./db/tables";
import { getPostgresKnex } from "./db/getPostgresKnex";

import { NodeTracerProvider } from "@opentelemetry/node";
import { BatchSpanProcessor } from "@opentelemetry/tracing";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { CollectorTraceExporter } from "@opentelemetry/exporter-collector-grpc";
import grpc = require("@grpc/grpc-js");

const REQUIRED_VARS = [
  "COOKIE_SECRET",
  "SSO_CLIENT_ID",
  "SSO_SECRET_KEY",
  "HONEYCOMB_API_KEY",
  "HONEYCOMB_DATASET",
];

import { buildLoggerFromFilename } from "./infra/logging/buildLogger";
const logger = buildLoggerFromFilename(__filename);

for (const envVar of REQUIRED_VARS) {
  if (!(envVar in process.env)) {
    logger.error(`Missing config param ${envVar} (check your .env file).`);
    process.exit(2);
  }
}

const metadata = new grpc.Metadata();
metadata.set("x-honeycomb-team", process.env["HONEYCOMB_API_KEY"] || "");
metadata.set("x-honeycomb-dataset", process.env["HONEYCOMB_DATASET"] || "");

const collectorOptions = {
  serviceName: "roster",
  url: "api.honeycomb.io:443",
  credentials: grpc.credentials.createSsl(),
  metadata,
};

const provider: NodeTracerProvider = new NodeTracerProvider();
const exporter = new CollectorTraceExporter(collectorOptions);
provider.addSpanProcessor(new BatchSpanProcessor(exporter));
provider.register();

Graceful.on("exit", async () => {
  await provider.shutdown();
});

registerInstrumentations({
  tracerProvider: provider,
  instrumentations: [
    new PgInstrumentation(),
    new HttpInstrumentation(),
    new ExpressInstrumentation(),
  ],
});

import * as express from "./infra/express/express";
import * as cron from "./infra/taskrunner/cron";
import * as taskRunner from "./infra/taskrunner/taskRunner";
import * as sde from "./eve/sde";

// Crash the process in the face of an unhandled promise rejection
process.on("unhandledRejection", (err) => {
  if (err instanceof Error) {
    logger.error(`Unhandled promise rejection`, err);
  } else {
    logger.error(`Unhandled promise rejection: ${err}`);
  }
  throw err;
});

main().catch((e) => {
  logger.error(`Fatal error during startup.`);
  logger.error(e);
  process.exit(2);
});

async function main() {
  const db = tables.build(getPostgresKnex());

  await sde.loadStaticData(db, false);

  taskRunner.init(db);
  cron.init(db);
  express.init(db, (port) => {
    logger.info(`Serving from port ${port}.`);
  });
}
