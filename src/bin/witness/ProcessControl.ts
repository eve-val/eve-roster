/* global NodeJS */

import * as child_process from "child_process";
import { ChildProcess } from "child_process";
import * as logger from "./logger.js";

/**
 * Manages the lifecycle of the child and parent processes.
 */
export class ProcessControl {
  private readonly _process: NodeJS.Process;
  private _child: ChildProcess | null = null;
  private _isShuttingDown = false;
  private _logsFlushed = false;
  private _childExited = false;

  constructor(process: NodeJS.Process) {
    this._process = process;
  }

  spawnChild(childPath: string) {
    if (this._child != null) {
      logger.error(`Cannot spawn child "${childPath}", already have a child.`);
      this.dieImmediately();
    }

    logger.log(`Spawning child "${childPath}"...`);

    const killHandler = this._onReceiveKillSignal.bind(this);
    process.on("SIGHUP", killHandler);
    process.on("SIGINT", killHandler);
    process.on("SIGQUIT", killHandler);
    process.on("SIGTERM", killHandler);

    const hook = require.resolve("import-in-the-middle/hook.mjs");
    this._child = child_process.fork(childPath, [], {
      stdio: ["ignore", "pipe", "pipe", "ipc"],
      execArgv: [...process.execArgv, `--experimental-loader=${hook}`],
    });
    this._child.on("error", this._onChildError.bind(this));
    this._child.on("exit", this._onChildExit.bind(this));

    return this._child;
  }

  onLogsFlushed() {
    this._logsFlushed = true;
    this._checkForShutdownComplete();
  }

  dieImmediately() {
    logger.error(`Executing emergency shutdown...`);
    if (this._child) {
      this._child.kill();
      this._child.kill("SIGKILL");
    }
    process.exit(2);
  }

  private _onReceiveKillSignal(signal: string) {
    logger.log(`Received ${signal}, shutting down...`);
    this._initiateShutdown();
  }

  private _onChildError(err: Error) {
    logger.error("Error from child process:");
    logger.error(err);
    this._initiateShutdown();
  }

  private _onChildExit(code: string, signal: number) {
    logger.log("Child exited w/ code", code, "and signal", signal);

    this._childExited = true;
    this._checkForShutdownComplete();
    setTimeout(() => {
      logger.error(`Logs took too long to flush, dying prematurely...`);
      process.exit(0);
    }, 10000);
  }

  private _initiateShutdown() {
    if (this._isShuttingDown) {
      // Already dying, ignore subsequent signals
      return;
    }
    this._isShuttingDown = true;

    if (this._child) {
      this._child.kill();
      setTimeout(() => {
        logger.error("Child took too long to die, sending SIGKILL...");
        this._child!.kill("SIGKILL");
      }, 7000);
    } else {
      // No child to wait for; exit immediately
      process.exit(0);
    }
  }

  private _checkForShutdownComplete() {
    if (this._logsFlushed && this._childExited) {
      process.exit(0);
    }
  }
}
