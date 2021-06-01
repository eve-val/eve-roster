import * as Sentry from "@sentry/browser";
import { Integrations } from "@sentry/tracing";

Sentry.init({
  dsn: "https://35f1cbe28c1742f7a8bc3d5c458ca413@o770816.ingest.sentry.io/5795739",
  integrations: [new Integrations.BrowserTracing()],
  tracesSampleRate: 1.0,
});

window.addEventListener("error", (event) => {
  Sentry.captureException(event);
});
window.addEventListener("unhandledrejection", (event) => {
  Sentry.captureException(event);
});
