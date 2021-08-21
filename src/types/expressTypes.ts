/* eslint @typescript-eslint/no-namespace: "off" */

import { Tnex } from "../db/tnex/index";

declare global {
  namespace Express {
    interface Application {
      locals: Record<"db", Tnex>;
    }
  }
}
