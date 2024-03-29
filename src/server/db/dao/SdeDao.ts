import { Dao } from "../dao.js";
import { Tnex } from "../tnex/Tnex.js";
import { SdeType, sdeType } from "../tables.js";

export default class SdeDao {
  constructor(private _dao: Dao) {}

  /**
   * Returns rows from the sdeType table that match the provided IDs. Caller
   * determines which columns are included.
   */
  getTypes(db: Tnex, ids: number[], columns: (keyof SdeType)[]) {
    return db
      .select(sdeType)
      .whereIn("styp_id", ids)
      .columns(...columns)
      .run();
  }
}
