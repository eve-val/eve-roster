/**
 * Wraps an Express route handler function with standard error handling and
 * logging. The `type` attribute should be either `'html'` or `'json'`. If
 * the `type` is `'html'`, the `handler` should return a promise to an object
 * with the structure `{ template: 'myTemplate', data: { ... } }`. If the `type`
 * is `'json'`, `handler` should return a promise to the Object that will make
 * up the JSON response.
 */
import express = require('express');

import { BadRequestError } from '../error/BadRequestError';
import { NotFoundError } from '../error/NotFoundError';
import { NoSuchAccountError } from '../error/NoSuchAccountError';
import { NotLoggedInError } from '../error/NotLoggedInError';
import { UnauthorizedClientError } from '../error/UnauthorizedClientError';
import { UserVisibleError } from '../error/UserVisibleError';

import { Tnex } from '../tnex';
import { AccountPrivileges } from './privileges';
import { getAccountPrivs, AccountSummary } from './getAccountPrivs';
import { SchemaVerificationError } from './schemaVerifier';
import { buildLoggerFromFilename } from '../logs/buildLogger';

const logger = buildLoggerFromFilename(__filename);


export type EndpointType = 'json' | 'html';

type ExpressHandler =
    (req: express.Request, res: express.Response) => void;

export type JsonEndpointHandler<T extends object> = (
  req: express.Request,
  res: express.Response,
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
  ) => Promise<T>;

export type HtmlEndpointHandler<T extends Object> = (
  req: express.Request,
  res: express.Response,
  db: Tnex,
  account: AccountSummary,
  privs: AccountPrivileges,
  ) => Promise<HtmlPayload<T>>;

export interface HtmlPayload<T extends object> {
  template: string,
  data: T,
}

export function endSession(req: express.Request) {
  // The express session type isn't marked as nullable even though this is the
  // recommended way to end a session, so we override the type system here.
  (req as any).session = null;
}

export function htmlEndpoint<T extends object>(
    handler: HtmlEndpointHandler<T>,
): ExpressHandler {
  return async function (req, res) {
    try {
      const accountPrivs = await getAccountPrivs(req.db, req.session.accountId);
      const payload =
          await handler(
              req, res, req.db, accountPrivs.account, accountPrivs.privs);
      res.render(payload.template, payload.data);
    } catch (e) {
      handleError('html', e, req, res);
    }
  }
}

export function jsonEndpoint<T extends object>(
    handler: JsonEndpointHandler<T>,
): ExpressHandler {
  return async function(req, res) {
    try {
      const accountPrivs = await getAccountPrivs(req.db, req.session.accountId);
      const payload =
          await handler(
              req, res, req.db, accountPrivs.account, accountPrivs.privs);

      const space = req.query.pretty != undefined ? 2 : undefined;
      res.type('json');
      res.send(JSON.stringify(payload, null, space));

    } catch (e) {
      handleError('json', e, req, res);
    }
  }
}

function handleError(
    type: EndpointType, e: Error, req: express.Request, res: express.Response) {
  if (isLoggableError(e)) {
    logger.error(`ERROR while handling endpoint ${req.originalUrl}`
      + ` w/ accountId ${req.session.accountId}`, e);
  }

  if (type == 'html' &&
      (e instanceof NotLoggedInError || e instanceof NoSuchAccountError)) {
    endSession(req);
    res.redirect('/login');
  } else {
    let [status, message] = getResponse(e);
    res.status(status);
    switch (type) {
      case 'json':
        res.type('json');
        res.send({ message: message });
        break;
      case 'html':
        res.send(message);
        break;
    }
  }
}

function getResponse(e: Error): [number, string] {
  if (e instanceof BadRequestError || e instanceof SchemaVerificationError) {
    return [400, 'Bad request'];
  } else if (e instanceof NotFoundError) {
    return [404, 'Not found'];
  } else if (e instanceof UnauthorizedClientError) {
    // Possibly should be 404
    return [403, 'Forbidden'];
  } else {
    let message;
    if (e instanceof UserVisibleError) {
      message = e.message;
    } else {
      message = 'Internal server error';
    }
    return [500, message];
  }
}

function isLoggableError(e: Error) {
  return !(e instanceof NotLoggedInError);
}
