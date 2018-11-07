import { UnprocessedKillmailRow } from '../../../db/dao/KillmailDao';
import { Killmail } from '../../../db/tables';

/** Represents a killmail that's moving through the processing pipeline. */
export interface ProcessedKillmail {

  /** The original row from the DB query */
  row: UnprocessedKillmailRow,

  /**
   * A related killmail, if any (e.g. the ship loss that preceded the capsule
   * loss)
   */
  relatedRow: Killmail | null,

  /**
   * Whether this row needs to be updated. True if relatedRow changes or if
   * this row was previously unprocessed.
   */
  modified: boolean,
}
