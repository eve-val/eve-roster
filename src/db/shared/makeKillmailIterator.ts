import { Tnex, val } from "../tnex/index.js";
import { Killmail, killmail } from "../tables.js";
import { Select } from "../tnex/Select.js";
import { StreamIterator } from "../../util/stream/BatchedObjectReadable.js";

// TODO: Make this properly generic once
// https://github.com/Microsoft/TypeScript/issues/24560 is fixed

/**
 * Creates a StreamIterator over killmails.
 *
 * Allows for iterating over rows in the DB (in this case, killmails). Use
 * modifyQuery() to narrow the scope of the iteration, perform joins, etc.
 *
 * Killmails will be in ascending timestamp order.
 */
export function makeKillmailIterator<J extends Killmail, S extends Killmail>(
  db: Tnex,
  batchSize: number,
  modifyQuery: (query: Select<Killmail, Killmail>) => Select<J, S>
): StreamIterator<S> {
  const iter = {
    _prevTimestamp: null as number | null,
    _previousMails: new Set<number>(),

    async next() {
      const originalQuery = db
        .select(killmail)
        .orderBy("km_timestamp", "asc")
        .orderBy("km_id", "asc")
        .columns(
          "km_id",
          "km_timestamp",
          "km_character",
          "km_victimCorp",
          "km_hullCategory",
          "km_relatedLoss",
          "km_data",
          "km_processed"
        )
        .limit(batchSize);
      if (this._prevTimestamp != null) {
        originalQuery.where("km_timestamp", ">=", val(this._prevTimestamp));
      }

      const query = modifyQuery(originalQuery);

      let rows = await query.run();
      rows = rows.filter(
        (row) => !this._previousMails.has(row.km_data.killmail_id)
      );

      if (rows.length > 0) {
        this._prevTimestamp = rows[rows.length - 1].km_timestamp;
        this._previousMails.clear();
        for (let i = rows.length - 1; i >= 0; i--) {
          const row = rows[i];
          if (row.km_timestamp != this._prevTimestamp) {
            break;
          }
          this._previousMails.add(row.km_data.killmail_id);
        }
      }
      return rows;
    },
  };
  return iter;
}
