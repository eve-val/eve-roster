import Graceful from "node-graceful";
Graceful.default.captureExceptions = true;

import * as Sentry from "@sentry/node";

import path from "path";
import querystring from "querystring";

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import favicon from "serve-favicon";

import rateLimit from "express-rate-limit";
import crypto from "crypto";
import csrf from "csurf";

import { Tnex } from "../../db/tnex/index.js";
import { isDevelopment } from "../../util/config.js";
import { EVE_SSO_LOGIN_PARAMS } from "../../domain/sso/loginParams.js";

import { default as route_api } from "../../route/api/api.js";
import { default as route_home } from "../../route/home.js";
import { default as route_authenticate } from "../../route/authenticate.js";
import { default as route_swagger } from "../../route/esi/swagger.js";
import { default as route_esi_proxy } from "../../route/esi/proxy.js";
import { getSession, endSession } from "./session.js";
import { checkNotNil } from "../../util/assert.js";
import { getProjectPaths } from "../build-client/paths.js";
import { Env } from "../init/Env.js";

const FRONTEND_ROUTES = [
  "/",
  "/roster",
  "/character/:id",
  "/housing",
  "/admin",
  "/admin/*",
  "/dev/",
  "/dev/:section",
  "/srp",
  "/srp/*",
  "/ships",
  "/ships/*",
];

export async function init(
  db: Tnex,
  env: Env,
  onServing: (port: number) => void
) {
  const app = express();
  app.locals.db = db;

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser(env.COOKIE_SECRET));
  app.use(csrf({ cookie: true }) as express.RequestHandler);

  app.use(
    cookieSession({
      name: "session",
      secret: env.COOKIE_SECRET,
    })
  );

  // For healthchecks
  app.get("/healthz", function (req, res) {
    res.send("ok");
  });

  // Includes root ('/')
  app.get(FRONTEND_ROUTES, route_home);

  app.get("/login", function (req, res) {
    const nonce = crypto.randomBytes(16).toString("base64");
    const session = getSession(req);
    session.nonce = nonce;
    res.render("login", {
      loginParams: EVE_SSO_LOGIN_PARAMS.get(env),
      nonce: querystring.escape(nonce),
    });
  });

  app.get("/authenticate", route_authenticate);

  app.get("/esi/swagger.json", route_swagger);
  app.all("/esi/proxy/*", route_esi_proxy);

  app.get("/logout", function (req, res) {
    endSession(req);
    res.redirect("/");
  });

  // Manually include the API routes defined in api/
  const limiter = rateLimit({
    windowMs: 60 * 1000,
    max: 100,
    standardHeaders: true,
    legacyHeaders: false,
  });
  app.use("/api", limiter);
  app.use("/api", route_api);

  // Set up client serving and dev mode (if in dev mode)
  await setupClientServing(app);

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

  // Start the server
  const server = app.listen(env.PORT, () => {
    onServing(env.PORT);
  });

  Graceful.default.on("exit", async () => {
    await server.close();
  });
}

async function setupClientServing(app: express.Application) {
  const paths = getProjectPaths();
  const outputPath = checkNotNil(paths.output);
  const publicPath = checkNotNil(paths.public);

  if (isDevelopment()) {
    const clientConfig = isDevelopment()
      ? (await import("../build-client/webpack.dev.js")).default
      : (await import("../build-client/webpack.prod.js")).default;
    const webpack = (await import("webpack")).default;
    const webpackDevMiddleware = (await import("webpack-dev-middleware"))
      .default;
    const webpackHotMiddleware = (await import("webpack-hot-middleware"))
      .default;

    const compiler = webpack(clientConfig);

    app.use(
      webpackDevMiddleware(compiler, {
        publicPath: publicPath,
        stats: "minimal",
      })
    );

    app.use(webpackHotMiddleware(compiler));
  }

  // Compiled front-end files from webpack
  app.use(
    publicPath,
    express.static(outputPath, { immutable: true, maxAge: "365d" })
  );
  app.set("view engine", "pug");
  app.set("views", outputPath);
  app.use(favicon(path.join(outputPath, "favicon.ico")));
}
