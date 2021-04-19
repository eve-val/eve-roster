/* eslint @typescript-eslint/no-namespace: "off" */

import { Tnex } from "../db/tnex";

declare global {
  namespace Express {
    interface Request {
      db: Tnex;
    }
  }
}
