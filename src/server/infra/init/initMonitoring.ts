import * as Sentry from "@sentry/node";
import Graceful from "node-graceful";
import { ChannelCredentials, Metadata } from "@grpc/grpc-js";
import * as opentelemetry from "@opentelemetry/sdk-node";
import resources from "@opentelemetry/resources";
const { Resource } = resources;
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import exporter from "@opentelemetry/exporter-trace-otlp-grpc";
const { OTLPTraceExporter } = exporter;
import { Env } from "./Env.js";

export function initMonitoring(env: Env) {
  // Init Honeycomb
  const metadata = new Metadata();
  metadata.set("x-honeycomb-team", env.HONEYCOMB_API_KEY);
  metadata.set("x-honeycomb-dataset", env.HONEYCOMB_DATASET);
  const sdk = new opentelemetry.NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "roster",
    }),
    traceExporter: new OTLPTraceExporter({
      url: "grpcs://api.honeycomb.io:443/",
      credentials: ChannelCredentials.createSsl(),
      metadata: metadata,
    }),
    instrumentations: [
      getNodeAutoInstrumentations({
        "@opentelemetry/instrumentation-fs": {
          enabled: false,
        },
      }),
    ],
  });
  sdk.start();

  Graceful.default.captureExceptions = true;
  Graceful.default.on("exit", async () => {
    await sdk.shutdown();
  });

  // Init Sentry
  Sentry.init({
    dsn: "https://63d54bc20d544dfa8d7eb6643a890c90@o770816.ingest.sentry.io/5795740",
    tracesSampleRate: 1.0,
  });
}
