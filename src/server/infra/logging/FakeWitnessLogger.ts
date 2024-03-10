import { LogLevel, Logger } from "./Logger.js";

/**
 * Used to silence logging in tests
 */
export class FakeWitnessLogger implements Logger {
  crit(_message: string, _error?: Error, _data?: object): void {}
  error(_message: string, _error?: Error, _data?: object): void {}
  warn(_message: string, _error?: Error, _data?: object): void {}
  info(_message: string, _data?: object): void {}
  verbose(_message: string, _data?: object): void {}
  debug(_message: string, _data?: object): void {}
  log(
    _level: LogLevel,
    _message: string,
    _error?: Error,
    _data?: object,
  ): void {}
}
