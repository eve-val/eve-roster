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