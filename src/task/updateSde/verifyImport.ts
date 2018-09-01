import { Tnex } from '../../db/tnex';
import * as sde from '../../eve/sde';

export async function verifyImport(db: Tnex) {
  await sde.loadStaticData(db, true /* strict mode */);
}
