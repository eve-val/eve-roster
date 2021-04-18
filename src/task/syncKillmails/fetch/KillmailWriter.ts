import { BatchedObjectWritable } from "../../../util/stream/BatchedObjectWritable";
import { Killmail } from "../../../db/tables";
import { Tnex, UpdatePolicy } from "../../../db/tnex";
import { dao } from "../../../db/dao";

/**
 * Simple batched DB writer for Killmails. Uses UPSERT rather than INSERT.
 */
export class KillmailWriter extends BatchedObjectWritable<Killmail> {
  private readonly _db: Tnex;
  private _writeCount = 0;

  constructor(db: Tnex, bufferSize: number) {
    super(bufferSize);
    this._db = db;
  }

  public getWriteCount() {
    return this._writeCount;
  }

  protected async _flush(rows: Killmail[]): Promise<void> {
    await dao.killmail.upsertKillmails(this._db, rows, {
      km_processed: UpdatePolicy.PRESERVE_EXISTING,
    });
    this._writeCount += rows.length;
  }
}
