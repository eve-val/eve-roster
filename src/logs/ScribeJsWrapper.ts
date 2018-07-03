import { Logger } from "./Logger";

import buildLegacyLogger = require('../util/logger');
import { printError } from "../util/error";


/**
 * Typed wrapper around our existing ScribeJS logger.
 */
export class ScribeJsWrapper implements Logger {
  private _logger: any;

  constructor(label: string) {
    this._logger = buildLegacyLogger(label);
  }

  crit(message: string, error?: Error, data?: object): void {
    this._logger.error(formatMessage(message, data));
    if (error) {
      this._logger.error(printError(error));
    }
  }

  error(message: string, error?: Error, data?: object): void {
    this._logger.error(formatMessage(message, data));
    if (error) {
      this._logger.error(printError(error));
    }
  }

  warn(message: string, error?: Error, data?: object): void {
    this._logger.warn(formatMessage(message, data));
    if (error) {
      this._logger.error(printError(error));
    }
  }

  info(message: string, data?: object): void {
    this._logger.info(formatMessage(message, data));
  }

  verbose(message: string, data?: object): void {
    this._logger.debug(formatMessage(message, data));
  }

  debug(message: string, data?: object): void {
    this._logger.debug(formatMessage(message, data));
  }
}

function formatMessage(message: string, data: object | undefined) {
  if (data == undefined) {
    return message;
  } else {
    return message + ' ' + JSON.stringify(data);
  }
}
