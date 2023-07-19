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
import { EVE_SSO_LOGIN_PARAMS } from "../../domain/sso/loginParams.js";

import { default as route_api } from "../../route/api/api.js";
import { default as route_home } from "../../route/home.js";
import { default as route_authenticate } from "../../route/authenticate.js";
import { default as route_swagger } from "../../route/esi/swagger.js";
import { default as route_esi_proxy } from "../../route/esi/proxy.js";
import { getSession, endSession } from "./session.js";
import { getProjectPaths } from "../build-client/paths.js";
import { Env } from "../init/Env.js";

import type { Compiler } from "webpack";
import type {
  API,
  IncomingMessage,
  ServerResponse,
} from "webpack-dev-middleware";
import { Puggle } from "./puggle.js";
import { EndpointContext } from "./EndpointContext.js";

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
  onServing: (port: number) => void,
) {
  const app = express();

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
    }),
  );

  // Serves `/` and all other webpack-compiled endpoints
  const puggle = await setupWebpackServing(env, db, app);

  // For healthchecks
  app.get("/healthz", function (req, res) {
    res.send("ok");
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

  // The error handler must be before any other error middleware and after all controllers
  app.use(Sentry.Handlers.errorHandler() as express.ErrorRequestHandler);

  // Make db and context available to route handlers
  app.locals.db = db;
  app.locals.context = {
    db: db,
    puggle: puggle,
  } as EndpointContext;

  // Start the server
  const server = app.listen(env.PORT, () => {
    onServing(env.PORT);
  });

  Graceful.default.on("exit", async () => {
    await server.close();
  });
}

/**
 * Sets up serving for all webpack-compiled assets, including some HTML pages.
 */
async function setupWebpackServing(
  env: Env,
  db: Tnex,
  app: express.Application,
) {
  const projectPaths = getProjectPaths();

  let devInfra: DevInfra | null = null;
  if (env.isDevelopment && env.CLIENT_DEV_MODE) {
    const webpack = (await import("webpack")).default;
    const clientConfig = (await import("../build-client/webpack.dev.js"))
      .default;
    const webpackDevMiddleware = (await import("webpack-dev-middleware"))
      .default;
    const webpackHotMiddleware = (await import("webpack-hot-middleware"))
      .default;
    const compiler = webpack(clientConfig);
    const devMiddleware = webpackDevMiddleware(compiler, {
      publicPath: projectPaths.public,
      stats: "minimal",
    });

    app.use(devMiddleware);
    app.use(webpackHotMiddleware(compiler));

    devInfra = {
      compiler,
      devMiddleware,
    };
  }

  // Block serving client pages until client is done compiling
  if (devInfra != null) {
    app.get([...FRONTEND_ROUTES, "/login"], waitForClientBuilt(devInfra));
  }

  // Includes root ('/')
  app.get(FRONTEND_ROUTES, route_home);

  app.get("/login", async function (req, res, next) {
    const nonce = crypto.randomBytes(16).toString("base64");
    const session = getSession(req);
    session.nonce = nonce;

    const context = req.app.locals.context as EndpointContext;
    try {
      await context.puggle.render(res, "login", {
        loginParams: EVE_SSO_LOGIN_PARAMS.get(env),
        nonce: querystring.escape(nonce),
      });
    } catch (e) {
      next(e);
    }
  });

  // Serve pre-compiled front-end files
  app.use(
    projectPaths.public,
    express.static(projectPaths.output, { immutable: true, maxAge: "365d" }),
  );

  // Serve favicon
  if (devInfra == null) {
    // TODO: favicon() is not compatible with the dev middleware, so for now we
    // just disable serving it when in dev mode. This may not longer be
    // necessary, since we're serving the favicon via the HtmlWebpackPlugin
    // build rules.
    app.use(favicon(path.join(projectPaths.output, "favicon.ico")));
  }

  return new Puggle(projectPaths.output, devInfra?.compiler);
}

function waitForClientBuilt(devInfra: DevInfra) {
  return async (
    req: express.Request,
    res: express.Response,
    next: express.NextFunction,
  ) => {
    devInfra.devMiddleware.waitUntilValid(() => {
      next();
    });
  };
}

interface DevInfra {
  compiler: Compiler;
  devMiddleware: API<IncomingMessage, ServerResponse>;
}
