
/**
 * Generic interface for logging.
 */
export interface Logger {
  crit(message: string, error?: Error, data?: object): void,
  error(message: string, error?: Error, data?: object): void,
  warn(message: string, error?: Error, data?: object): void,
  info(message: string, data?: object): void,
  verbose(message: string, data?: object): void,
  debug(message: string, data?: object): void,
}
