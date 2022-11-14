import * as Sentry from "@sentry/node";
import Graceful from "node-graceful";
import { NodeTracerProvider } from "@opentelemetry/sdk-trace-node";
import { BatchSpanProcessor } from "@opentelemetry/sdk-trace-base";
import { registerInstrumentations } from "@opentelemetry/instrumentation";
import { ExpressInstrumentation } from "@opentelemetry/instrumentation-express";
import { HttpInstrumentation } from "@opentelemetry/instrumentation-http";
import { PgInstrumentation } from "@opentelemetry/instrumentation-pg";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-grpc";
import { Metadata, ChannelCredentials } from "@grpc/grpc-js";

import { Env } from "./Env.js";

export function initMonitoring(env: Env) {
  // Init Sentry

  Sentry.init({
    dsn: "https://63d54bc20d544dfa8d7eb6643a890c90@o770816.ingest.sentry.io/5795740",
    tracesSampleRate: 1.0,
  });

  // Init Honeycomb

  const metadata = new Metadata();
  metadata.set("x-honeycomb-team", env.HONEYCOMB_API_KEY);
  metadata.set("x-honeycomb-dataset", env.HONEYCOMB_DATASET);

  const collectorOptions = {
    serviceName: "roster",
    url: "grpcs://api.honeycomb.io:443/",
    credentials: ChannelCredentials.createSsl(),
    metadata,
  };

  const provider: NodeTracerProvider = new NodeTracerProvider();
  const exporter = new OTLPTraceExporter(collectorOptions);
  provider.addSpanProcessor(new BatchSpanProcessor(exporter));
  provider.register();

  Graceful.default.captureExceptions = true;
  Graceful.default.on("exit", async () => {
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
}
