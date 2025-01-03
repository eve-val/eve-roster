import * as Sentry from "@sentry/node";
import Graceful from "node-graceful";
import * as opentelemetry from "@opentelemetry/sdk-node";
import { Resource } from "@opentelemetry/resources";
import { SemanticResourceAttributes } from "@opentelemetry/semantic-conventions";
import { getNodeAutoInstrumentations } from "@opentelemetry/auto-instrumentations-node";
import { OTLPTraceExporter } from "@opentelemetry/exporter-trace-otlp-proto";
import { Env } from "./Env.js";

export function initMonitoring(env: Env) {
  // Init Honeycomb
  const sdk = new opentelemetry.NodeSDK({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: "roster",
    }),
    traceExporter: new OTLPTraceExporter({
      url: "https://api.honeycomb.io:443/",
      headers: {
        "x-honeycomb-team": env.HONEYCOMB_API_KEY,
        "x-honeycomb-dataset": env.HONEYCOMB_DATASET,
      },
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
