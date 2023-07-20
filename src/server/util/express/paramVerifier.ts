/* eslint-disable @typescript-eslint/no-base-to-string, @typescript-eslint/no-unsafe-return */

import express from "express";

import { BadRequestError } from "../../error/BadRequestError.js";
import { MixedObject } from "../../../shared/util/simpleTypes.js";

const POSITIVE_INTEGER_PATTERN = /^\d+$/;

export function stringParam(req: express.Request, key: string): string {
  return getParam(req, key);
}

export function idParam(req: express.Request, key: string): number {
  const strParam = getParam(req, key);
  if (!POSITIVE_INTEGER_PATTERN.test(strParam)) {
    throw new BadRequestError(
      `Value "${strParam}" for key "${key}" is not a valid ID.`,
    );
  }
  return parseInt(strParam);
}

export function stringQuery(
  req: express.Request,
  key: string,
): string | undefined {
  return getStringQuery(req, key);
}

export function boolQuery(
  req: express.Request,
  key: string,
): boolean | undefined {
  if (req.query[key] == undefined) {
    return undefined;
  } else {
    return req.query[key] == "true" || req.query[key] == "";
  }
}

export function intQuery(
  req: express.Request,
  key: string,
): number | undefined {
  const val = getStringQuery(req, key);
  if (val == undefined) {
    return undefined;
  }
  const parsedVal = parseInt(val);
  if (isNaN(parsedVal)) {
    return undefined;
  } else {
    return parsedVal;
  }
}

export function enumQuery<EType extends string>(
  req: express.Request,
  key: string,
  enu: MixedObject,
): EType | undefined {
  const value = getStringQuery(req, key);
  if (value === undefined) {
    return value;
  }
  for (const v in enu) {
    // TODO: Figure out a way for these types to work
    if ((enu[v] as any) == value) {
      return value as any;
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
  key: string,
): object | undefined {
  const val = getStringQuery(req, key);
  if (val == undefined) {
    return val;
  } else {
    try {
      return JSON.parse(val);
    } catch (err) {
      if (err instanceof SyntaxError) {
        throw new BadRequestError(`Query "${key}" is not valid JSON.`);
      } else {
        throw err;
      }
    }
  }
}

function getParam(req: express.Request, key: string): string {
  const param = req.params[key];

  if (param == undefined) {
    throw new BadRequestError(`Param ${key} not supplied.`);
  }
  if (typeof param != "string") {
    throw new BadRequestError(
      `Wrong type on param ${key}. Was expecting "string" but` +
        ` got "${typeof param}".`,
    );
  }
  if (param.length == 0) {
    throw new BadRequestError(`Param ${key} is empty.`);
  }
  return param;
}

function getStringQuery(req: express.Request, key: string): string | undefined {
  const val = req.query[key];
  if (typeof val != "string" && typeof val != "undefined") {
    throw new Error(`Invalid query type for '${key}': ${val} (${typeof val})`);
  }
  return val;
}
