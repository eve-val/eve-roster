import express = require('express');

import { BadRequestError } from '../error/BadRequestError';


const POSITIVE_INTEGER_PATTERN = /^\d+$/;

export function stringParam(req: express.Request, key: string): string {
  return getParam(req, key);
}

export function idParam(req: express.Request, key: string): number {
  let strParam = getParam(req, key);
  if (!POSITIVE_INTEGER_PATTERN.test(strParam)) {
    throw new BadRequestError(
        `Value "${strParam}" for key "${key}" is not a valid ID.`);
  }
  return parseInt(strParam);
}

export function stringQuery(
    req: express.Request, key: string): string | undefined {
  return req.query[key];
}

export function boolQuery(
    req: express.Request, key: string): boolean | undefined {
  if (req.query[key] == undefined) {
    return undefined;
  } else {
    return req.query[key] == 'true' || req.query[key] == '';
  }
}

export function intQuery(
    req: express.Request, key: string): number | undefined {
  if (isNaN(req.query[key])) {
    return undefined;
  } else {
    return parseInt(req.query[key]);
  }
}

export function enumQuery<EType extends string, Eobj extends object = object>(
    req: express.Request, key: string, enu: Eobj): EType | undefined {
  let value = req.query[key];
  if (value === undefined) {
    return value;
  }
  for (let v in enu) {
    if (enu[v] == value) {
      return value;
    }
  }
  throw new BadRequestError(`Non-enum value "${value}" for key "${key}".`);
}


/**
 * Attempts to parse the specified GET query param as a JSON object.
 * Throws a BadRequestError if the parse fails. Otherwise returns the parsed
 * object or undefined if the param was not specified.
 */
export function jsonQuery(
    req: express.Request,
    queryParam: string,
): object | undefined {
  const value = req.query[queryParam];
  if (value == undefined) {
    return value;
  } else {
    try {
      return JSON.parse(value);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new BadRequestError(`Query "${queryParam}" is not valid JSON.`);
      } else {
        throw err;
      }
    }
  }
}

function getParam(req: express.Request, key: string): string {
  let param = req.params[key];

  if (param == undefined) {
    throw new BadRequestError(`Param ${key} not supplied.`);
  }
  if (typeof param != 'string') {
    throw new BadRequestError(
        `Wrong type on param ${key}. Was expecting "string" but`
            + ` got "${typeof param}".`)
  }
  if (param.length == 0) {
    throw new BadRequestError(`Param ${key} is empty.`)
  }
  return param;
}
