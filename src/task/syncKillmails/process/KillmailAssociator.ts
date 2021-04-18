import { Transform, TransformCallback } from "../../../util/stream/Transform";
import { UnprocessedKillmailRow } from "../../../db/dao/KillmailDao";
import { ArrayQueue } from "../../../util/collection/ArrayQueue";
import { HullCategory } from "../../../db/dao/enums";
import { BasicCallback } from "../../../util/stream/core";
import { ProcessedKillmail } from "./ProcessedKillmail";

/**
 * Associates capsule losses with the ship they came from (if any).
 *
 * Uses a sliding window to detect this association; losses that occur farther
 * apart than the window won't be recognized.
 */
export class KillmailAssociator extends Transform<
  UnprocessedKillmailRow,
  ProcessedKillmail
> {
  private readonly _maxTimeWindow: number;
  private readonly _queue = new ArrayQueue<ProcessedKillmail>();
  private readonly _map = new Map<number, ProcessedKillmail>();

  constructor(timeWindow: number) {
    super({ objectMode: true });

    this._maxTimeWindow = timeWindow;
  }

  _transform(
    chunk: UnprocessedKillmailRow,
    encoding: string,
    callback: TransformCallback<ProcessedKillmail>
  ) {
    this._flushKillmailsEarlierThan(chunk.km_timestamp - this._maxTimeWindow);

    const qkm = {
      row: chunk,
      relatedRow: null,
      modified: !chunk.km_processed,
    };

    // Check to see if there's an earlier loss with the same victim
    const victim = chunk.km_data.victim.character_id;
    if (victim != undefined) {
      const prevLoss = this._map.get(victim);
      if (
        prevLoss &&
        prevLoss.row.km_hullCategory == HullCategory.SHIP &&
        chunk.km_hullCategory == HullCategory.CAPSULE
      ) {
        setRelatedLoss(prevLoss, qkm);
        setRelatedLoss(qkm, prevLoss);
      }
      this._map.set(victim, qkm);
    }
    this._queue.enqueue(qkm);

    callback();
  }

  _final(callback: BasicCallback) {
    this._map.clear();
    while (this._queue.size() > 0) {
      this._flushKillmail(this._queue.dequeue());
    }
    callback();
  }

  private _flushKillmailsEarlierThan(timestamp: number) {
    while (
      this._queue.size() > 0 &&
      this._queue.peek().row.km_timestamp < timestamp
    ) {
      this._flushKillmail(this._queue.dequeue());
    }
  }

  private _flushKillmail(qkm: ProcessedKillmail) {
    const victim = qkm.row.km_data.victim.character_id;
    if (victim != undefined && this._map.get(victim) == qkm) {
      this._map.delete(victim);
    }
    this.push(qkm);
  }
}

function setRelatedLoss(qkm: ProcessedKillmail, related: ProcessedKillmail) {
  if (qkm.row.km_relatedLoss != related.row.km_id) {
    qkm.modified = true;
    qkm.row.km_relatedLoss = related.row.km_id;
    qkm.relatedRow = related.row;
  }
}
