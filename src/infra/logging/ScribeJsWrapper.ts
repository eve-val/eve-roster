import { Logger, LogLevel } from "./Logger";

import buildLegacyLogger = require('./legacyLogger');
import { printError } from "../../data-source/esi/error";


/**
 * Typed wrapper around our existing ScribeJS logger.
 */
export class ScribeJsWrapper implements Logger {
  private _logger: any;

  constructor(label: string) {
    this._logger = buildLegacyLogger(label);
  }

  crit(message: string, error?: Error, data?: object): void {
    this.log(LogLevel.CRIT, message, error, data);
  }

  error(message: string, error?: Error, data?: object): void {
    this.log(LogLevel.ERROR, message, error, data);
  }

  warn(message: string, error?: Error, data?: object): void {
    this.log(LogLevel.WARN, message, error, data);
  }

  info(message: string, data?: object): void {
    this.log(LogLevel.INFO, message, undefined, data);
  }

  verbose(message: string, data?: object): void {
    this.log(LogLevel.VERBOSE, message, undefined, data);
  }

  debug(message: string, data?: object): void {
    this.log(LogLevel.DEBUG, message, undefined, data);
  }

  log(level: LogLevel, message: string, error?: Error, data?: object) {
    const legacyLevel = publicLevelToLegacyLevel(level);
    this._logger.log(legacyLevel, formatMessage(message, data));
    if (error) {
      this._logger.log(legacyLevel, printError(error));
    }
  }
}

function formatMessage(message: string, data: object | undefined) {
  if (data == undefined) {
    return message;
  } else {
    return message + ' ' + JSON.stringify(data);
  }
}

function publicLevelToLegacyLevel(level: LogLevel) {
  switch (level) {
    case LogLevel.CRIT:
      return 'error';
    case LogLevel.ERROR:
      return 'error';
    case LogLevel.WARN:
      return 'warn';
    case LogLevel.INFO:
      return 'info';
    case LogLevel.VERBOSE:
      return 'info';
    case LogLevel.DEBUG:
      return 'debug';
  }
}
