/**
 * Generic interface for logging.
 */
export interface Logger {
  crit(message: string, error?: unknown, data?: object): void;
  error(message: string, error?: unknown, data?: object): void;
  warn(message: string, error?: unknown, data?: object): void;
  info(message: string, data?: object): void;
  verbose(message: string, data?: object): void;
  debug(message: string, data?: object): void;
  log(level: LogLevel, message: string, error?: unknown, data?: object): void;
}

export enum LogLevel {
  DEBUG = "debug",
  VERBOSE = "verbose",
  INFO = "info",
  WARN = "warn",
  ERROR = "error",
  CRIT = "crit",
}
