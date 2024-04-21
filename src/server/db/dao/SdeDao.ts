import { Dao } from "../dao.js";
import { Tnex } from "../tnex/Tnex.js";
import {
  SdeAttribute,
  SdeType,
  SdeTypeAttribute,
  sdeAttribute,
  sdeType,
  sdeTypeAttribute,
} from "../tables.js";

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

  getTypeAttributes<
    K extends keyof (SdeType & SdeTypeAttribute & SdeAttribute),
  >(db: Tnex, typeIds: number[], attrIds: number[], columns: K[]) {
    let query = db
      .select(sdeType)
      .join(sdeTypeAttribute, "sta_type", "=", "styp_id")
      .join(sdeAttribute, "sattr_id", "=", "sta_attribute")
      .whereIn("styp_id", typeIds)
      .columns(...columns);

    if (attrIds.length > 0) {
      query = query.whereIn("sattr_id", attrIds);
    }

    return query.run();
  }
}
