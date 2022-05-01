/* eslint @typescript-eslint/no-namespace: "off" */

import { Tnex } from "../db/tnex/index.js";

declare global {
  namespace Express {
    interface Application {
      locals: Record<"db", Tnex>;
    }
  }
}
