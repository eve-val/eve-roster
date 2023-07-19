import {
  Transform,
  TransformCallback,
} from "../../../util/stream/Transform.js";
import { ZKillmail } from "../../../data-source/zkillboard/ZKillmail.js";
import { Killmail } from "../../../db/tables.js";
import { ArrayQueue } from "../../../util/collection/ArrayQueue.js";
import { killmailToRow } from "./killmailToRow.js";
import { BasicCallback } from "../../../util/stream/core.js";
import { JobLogger } from "../../../infra/taskrunner/Job.js";

/**
 * Given a stream of killmails whose timestamps are *mostly* in descending
 * timestamp order, reorders them to actually be in order. Excludes duplicate
 * killmails and killmails who timestamps are outside the time bounds provided.
 *
 * The stream uses a sliding window to perform the reordering. Out-of-order
 * killmails whose timestamps differ by more than the time window won't be
 * properly reordered.
 *
 * This class exists to solve two separate problems. First, killmails are
 * returned from both ESI and ZKill in descending ID order. This *usually*
 * corresponds to descending timestamp order, but in certain situations a
 * killmail with a lower ID will have a higher timestamp. As a result, we need
 * to reorder them. Second, neither the ZKill nor ESI endpoints supply the
 * timestamp in their results; we have to fetch the entire killmail data in
 * order to learn that. This means that upstream data sources don't know when
 * they've exceeded the desired fetch window and so don't know when to stop
 * fetching data. It's only once we have the properly-ordered output of this
 * stream that we can make that determination. When the stream detects that it's
 * reached beyond the "start" bound (remember that we're moving backwards in
 * time), it emits an `'exceedBounds'` event and ignores any further input.
 * Upstream stream should listen for this event and close themselves.
 */
export class KillmailOrderer extends Transform<ZKillmail, Killmail> {
  private readonly _logger: JobLogger;
  private readonly _sourceCorporation: number;
  private readonly _startBound: number;
  private readonly _endBound: number | undefined;
  private readonly _maxTimeWindow: number;
  private readonly _queue = new ArrayQueue<Killmail>();
  private readonly _queuedIds = new Set<number>();
  private _closed = false;
  private _outOfOrderCount = 0;

  /**
   * @param sourceCorporation The corporation whose killboard is the source of
   * these killmails.
   * @param start The beginning of the time window. Once the stream encounters
   * an ordered killmail earlier than this timestamp, it will emit an
   * `'exceedBounds'` event and ignore any further inputs.
   * @param end The end of the time window. Any killmails later than this point
   * will be ignored.
   * @param timeWindow The size of the time window to use, in milliseconds. Only
   * killmails whose timestamps are within the time window of one another are
   * guaranteed to be properly ordered. In practice, this value can be small
   * -- on the order of 10 minutes.
   */
  constructor(
    logger: JobLogger,
    sourceCorporation: number,
    start: number,
    end: number | undefined,
    timeWindow: number,
  ) {
    super({ objectMode: true });

    this._logger = logger;
    this._sourceCorporation = sourceCorporation;
    this._startBound = start;
    this._endBound = end;
    this._maxTimeWindow = timeWindow;
  }

  _transform(
    chunk: ZKillmail,
    encoding: string,
    callback: TransformCallback<Killmail>,
  ) {
    let wasError = false;
    try {
      this._peformTransform(chunk);
    } catch (e) {
      wasError = true;
      this.emit("error", e);
    }
    if (!wasError) {
      callback();
    }
  }

  private _peformTransform(chunk: ZKillmail) {
    if (this._queuedIds.has(chunk.killmail_id)) {
      this._logger.info(`Ignoring duplicate killmail ${chunk.killmail_id}.`);
      return;
    }
    this._queuedIds.add(chunk.killmail_id);

    const row = killmailToRow(chunk);

    if (
      this._queue.size() > 0 &&
      this._queue.peekEnd().km_timestamp < row.km_timestamp
    ) {
      this._outOfOrderCount++;
      if (this._outOfOrderCount > MAX_OUT_OF_ORDER_TOLERANCE) {
        throw new Error(
          `ZKillboard returned ${this._outOfOrderCount} consecutive results` +
            ` in the wrong temporal order. Their API might have changed.`,
        );
      }

      let i;
      for (i = this._queue.start(); i < this._queue.end(); i++) {
        if (this._queue.get(i).km_timestamp < row.km_timestamp) {
          this._logger.info(
            `Found an out of order killmail, inserting at position ${i}.`,
          );
          this._queue.insert(i, row);
          break;
        }
      }
      if (i == this._queue.end()) {
        throw new Error(`Reordering comparison algorithm has a bug in it.`);
      }
    } else {
      this._outOfOrderCount = 0;
      this._queue.enqueue(row);
    }

    while (
      this._queue.size() > 0 &&
      Math.abs(this._queue.peek().km_timestamp - row.km_timestamp) >=
        this._maxTimeWindow
    ) {
      this._writeRow(this._queue.dequeue());
    }
  }

  _final(callback: BasicCallback) {
    while (this._queue.size() > 0) {
      this._writeRow(this._queue.dequeue());
    }
    callback();
  }

  private _writeRow(row: Killmail) {
    this._queuedIds.delete(row.km_id);

    if (this._closed) {
      // Ignore row
    } else if (
      this._endBound != undefined &&
      row.km_timestamp > this._endBound
    ) {
      // Ignore row
    } else if (row.km_timestamp < this._startBound) {
      this._closed = true;
      this.emit("exceedBounds");
    } else {
      const end = this._endBound || Date.now();
      this._logger.setProgress(
        (end - row.km_timestamp) / (end - this._startBound),
        `Syncing killmails for corp ${this._sourceCorporation}...`,
      );
      this.push(row);
    }
  }
}

const MAX_OUT_OF_ORDER_TOLERANCE = 4;
