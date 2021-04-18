import { Tnex } from "../db/tnex";

declare global {
  namespace Express {
    interface Request {
      db: Tnex;
    }
  }
}
