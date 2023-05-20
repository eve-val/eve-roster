import { Tnex } from "../../db/tnex/index.js";
import * as sde from "../../eve/sde.js";
import { Logger } from "../../infra/logging/Logger.js";

export async function verifyImport(db: Tnex, logger: Logger) {
  await sde.loadStaticData(db, true /* strict mode */, logger);
}
