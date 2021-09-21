import Graceful from "node-graceful";
Graceful.captureExceptions = true;

import * as Sentry from "@sentry/node";

import path from "path";

import express from "express";
import bodyParser from "body-parser";
import cookieParser from "cookie-parser";
import cookieSession from "cookie-session";
import favicon from "serve-favicon";
import csrf from "csurf";

import { Tnex } from "../../db/tnex/index";
import { isDevelopment } from "../../util/config";
import { LOGIN_PARAMS } from "../../domain/sso/loginParams";

import { default as route_api } from "../../route/api/api";
import { default as route_home } from "../../route/home";
import { default as route_authenticate } from "../../route/authenticate";
import { default as route_swagger } from "../../route/esi/swagger";
import { default as route_esi_proxy } from "../../route/esi/proxy";
import { endSession } from "./session";
import { checkNotNil } from "../../util/assert";
import { getProjectPaths } from "../build-client/paths";

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

export async function init(db: Tnex, onServing: (port: number) => void) {
  const app = express();
  app.locals.db = db;

  // The request handler must be the first middleware on the app
  app.use(Sentry.Handlers.requestHandler() as express.RequestHandler);
  app.use(bodyParser.json());
  app.use(bodyParser.urlencoded({ extended: true }));
  app.use(cookieParser(process.env.COOKIE_SECRET));
  app.use(csrf({ cookie: true }) as express.RequestHandler);

  app.use(
    cookieSession({
      name: "session",
      secret: process.env.COOKIE_SECRET,
    })
  );

  // For healthchecks
  app.get("/healthz", function (req, res) {
    res.send("ok");
  });

  // Includes root ('/')
  app.get(FRONTEND_ROUTES, route_home);

  app.get("/login", function (req, res) {
    res.render("login", {
      loginParams: LOGIN_PARAMS,
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
  app.use("/api", route_api);

  // Set up client serving and dev mode (if in dev mode)
  await setupClientServing(app);

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

  // Start the server
  const port = parseInt(process.env.PORT || "8081");
  const server = app.listen(port, () => {
    onServing(port);
  });

  Graceful.on("exit", async () => {
    await server.close();
  });
}

async function setupClientServing(app: express.Application) {
  const paths = getProjectPaths();
  const outputPath = checkNotNil(paths.output);
  const publicPath = checkNotNil(paths.public);

  if (isDevelopment()) {
    const clientConfig = isDevelopment()
      ? (await import("../build-client/webpack.dev")).default
      : (await import("../build-client/webpack.prod")).default;
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
