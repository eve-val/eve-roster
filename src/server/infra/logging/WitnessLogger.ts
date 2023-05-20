import { Logger, LogLevel } from "./Logger.js";
import * as protocol from "../../bin/witness/protocol.js";
import { printError } from "../../data-source/esi/error.js";
import { nil } from "../../../shared/util/simpleTypes.js";

export class WitnessLogger implements Logger {
  private _tag: string | nil;

  constructor(tag: string | nil) {
    this._tag = tag;
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

  log(level: LogLevel, message: string, error?: Error, data?: object): void {
    const levelTag = logLevelToProtocolTag(level);
    logMessage(levelTag, this._formatMessage(message, data));
    if (error) {
      logMessage(levelTag, printError(error));
    }
  }

  private _formatMessage(message: string, data: object | undefined) {
    const formatted = this._tag ? `[${this._tag}] ${message}` : message;

    if (data == undefined) {
      return formatted;
    } else {
      return `${formatted} ${JSON.stringify(data)}`;
    }
  }
}

function logMessage(level: protocol.LevelTag, message: string) {
  if (message.indexOf("\n") == -1) {
    process.stdout.write(protocol.formatInputLine(Date.now(), level, message));
  } else {
    const lines = message.split("\n");
    for (const line of lines) {
      logMessage(level, line);
    }
  }
}

function logLevelToProtocolTag(level: LogLevel): protocol.LevelTag {
  switch (level) {
    case LogLevel.CRIT:
      return "E";
    case LogLevel.ERROR:
      return "E";
    case LogLevel.WARN:
      return "W";
    case LogLevel.INFO:
      return "I";
    case LogLevel.VERBOSE:
      return "V";
    case LogLevel.DEBUG:
      return "D";
  }
}
