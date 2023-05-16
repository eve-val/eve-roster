import * as fs from "fs";
import * as path from "path";
import moment from "moment";
import { Writable } from "stream";
import { WriteStream } from "fs";
import { BasicCallback } from "../../util/stream/core.js";
import { Moment } from "moment";
import { asyncEach } from "./asyncEach.js";
import { pruneOldLogs } from "./pruneOldLogs.js";
import * as logger from "./logger.js";
import {
  formatLogFilename,
  getLogFormatSpecifier,
  formatOutputLine,
  parseInputLine,
} from "./protocol.js";

/**
 * Writes log output to a text file.
 *
 * Rotates the file once every day. Deletes log files after they're older than
 * `maxFileLifetime`.
 */
export class RotatingFileLogWriter extends Writable {
  private readonly _bucketSize: moment.unitOfTime.StartOf = "day";

  private readonly _baseLogFilePath: string;
  private readonly _maxFileLifetime: number;

  private _fileStart: number | null = null;
  private _logFileStream: WriteStream | null = null;

  constructor(basePath: string, maxFileLifetime: number) {
    super();
    logger.log("Base logs path:", basePath);
    this._baseLogFilePath = basePath;
    this._maxFileLifetime = maxFileLifetime;
  }

  _write(chunk: Buffer, encoding: string, callback: BasicCallback) {
    try {
      this._processChunk(chunk.toString("utf8"), callback);
    } catch (err) {
      if (err instanceof Error) {
        callback(err);
      } else {
        throw err;
      }
    }
  }

  _writev?(
    chunks: { chunk: Buffer; encoding: string }[],
    callback: BasicCallback
  ): void {
    try {
      asyncEach(
        chunks,
        (entry, entryCb) => {
          this._processChunk(entry.chunk.toString("utf8"), entryCb);
        },
        callback
      );
    } catch (err) {
      if (err instanceof Error) {
        callback(err);
      } else {
        throw err;
      }
    }
  }

  _destroy(err: Error | null, callback: (error: Error | null) => void) {
    if (this._logFileStream != null) {
      this._logFileStream.destroy(err || undefined);
    }
    // TODO: Do we need to call callback() here?
    callback(null);
  }

  private _processChunk(chunk: string, callback: BasicCallback) {
    const breakIndex = chunk.indexOf("\n");
    if (breakIndex != -1 && breakIndex != chunk.length - 1) {
      this._processMultiline(chunk, callback);
    } else {
      this._processLine(chunk, callback);
    }
  }

  private _processMultiline(chunk: string, callback: BasicCallback) {
    const strippedChunk = chunk.endsWith("\n")
      ? chunk.substr(0, chunk.length - 1)
      : chunk;
    const splits = strippedChunk.split("\n");
    asyncEach(
      splits,
      (entry, entryCb) => {
        this._processLine(entry, entryCb);
      },
      callback
    );
  }

  private _processLine(line: string, callback: BasicCallback) {
    let timestamp: Moment;
    let levelTag: string;
    let message: string;

    const match = parseInputLine(line);
    if (match) {
      timestamp = moment.utc(parseInt(match[1]));
      levelTag = match[2];
      message = match[3];
    } else {
      timestamp = moment.utc();
      levelTag = "U";
      message = line;
    }

    let outLine = formatOutputLine(timestamp, levelTag, message);

    this._getFileFor(timestamp, (err, stream) => {
      if (err) {
        callback(err);
      } else {
        console.log(outLine);
        if (!outLine.endsWith("\n")) {
          outLine += "\n";
        }
        stream.write(outLine, callback);
      }
    });
  }

  private _getFileFor(
    timestamp: Moment,
    callback: (err: Error | null, stream: WriteStream) => void
  ) {
    const bucketStart = timestamp.startOf(this._bucketSize);

    if (
      this._logFileStream != null &&
      this._fileStart == bucketStart.valueOf()
    ) {
      callback(null, this._logFileStream);
    } else {
      this._rotateLogFile(bucketStart, callback);
    }
  }

  private _rotateLogFile(
    fileStart: Moment,
    callback: (err: Error | null, stream: WriteStream) => void
  ) {
    const newFilePath = this._getLogFilePath(fileStart);
    logger.log("Opening log file", newFilePath);

    if (this._logFileStream != null) {
      this._logFileStream.destroy();
    }
    this._logFileStream = null;
    this._fileStart = null;

    pruneOldLogs(this._baseLogFilePath, this._maxFileLifetime, (err) => {
      if (err) {
        this.emit("error", err);
      }
    });

    openFileForAppend(newFilePath, (err, stream) => {
      if (err) {
        callback(err, null!);
      } else {
        this._logFileStream = stream;
        this._fileStart = fileStart.valueOf();
        this._logFileStream.write(getLogFormatSpecifier());
        callback(null, stream);
      }
    });
  }

  private _getLogFilePath(logStart: Moment) {
    return path.join(this._baseLogFilePath, formatLogFilename(logStart));
  }
}

function openFileForAppend(
  filepath: string,
  callback: (err: Error | null, stream: WriteStream) => void
) {
  fs.open(filepath, "a", (err, fd) => {
    if (err) {
      callback(err, null!);
    } else {
      const outStream = fs.createWriteStream("", {
        fd: fd,
        flags: "a",
        encoding: "utf8",
      });
      callback(null, outStream);
    }
  });
}
