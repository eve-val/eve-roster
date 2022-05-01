import { Tnex } from "../../db/tnex/index.js";
import * as sde from "../../eve/sde.js";

export async function verifyImport(db: Tnex) {
  await sde.loadStaticData(db, true /* strict mode */);
}
