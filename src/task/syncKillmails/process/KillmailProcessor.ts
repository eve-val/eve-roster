import { BatchedObjectWritable } from "../../../util/stream/BatchedObjectWritable";
import { ProcessedKillmail } from "./ProcessedKillmail";
import { Tnex } from "../../../db/tnex/index";
import { dao } from "../../../db/dao";
import { LossRow } from "../../../domain/srp/triage/triageLosses";
import { autoTriageLosses } from "../../../domain/srp/triage/autoTriageLosses";
import { Killmail } from "../../../db/tables";

/**
 * Marks rows as processed, updates relatedLoss (if necessary), creates SRP
 * entries (if necessary), and commits any appropriate autotriage.
 */
export class KillmailProcessor extends BatchedObjectWritable<ProcessedKillmail> {
  private readonly _db: Tnex;
  private _processCount = 0;
  private _srpCount = 0;

  constructor(db: Tnex, bufferSize: number) {
    super(bufferSize);

    this._db = db;
  }

  public getProcessedCount() {
    return this._processCount;
  }

  public getSrpCount() {
    return this._srpCount;
  }

  protected async _flush(chunks: ProcessedKillmail[]): Promise<void> {
    const updateRows: Pick<
      Killmail,
      "km_id" | "km_relatedLoss" | "km_processed"
    >[] = [];
    const kmIds: number[] = [];
    const triageRows: LossRow[] = [];

    for (const qkm of chunks) {
      if (qkm.modified) {
        updateRows.push({
          km_id: qkm.row.km_id,
          km_relatedLoss: qkm.row.km_relatedLoss,
          km_processed: true,
        });
      }

      const isLoss = qkm.row.mcorp_corporationId != null;

      if (isLoss && !qkm.row.km_processed) {
        kmIds.push(qkm.row.km_id);
        triageRows.push({
          km_timestamp: qkm.row.km_timestamp,
          km_data: qkm.row.km_data,
          related_data: qkm.relatedRow ? qkm.relatedRow.km_data : null,
          account_mainCharacter: qkm.row.account_mainCharacter,
        });
      }
    }

    await dao.killmail.updateKillmails(this._db, updateRows);

    if (kmIds.length > 0) {
      await dao.srp.createSrpEntries(this._db, kmIds);
    }

    if (triageRows.length > 0) {
      await autoTriageLosses(this._db, triageRows);
    }

    this._processCount += chunks.length;
    this._srpCount += kmIds.length;
  }
}
