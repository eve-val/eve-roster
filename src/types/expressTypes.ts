import { Tnex } from '../tnex';

declare global {
  namespace Express {
    interface Request {
      db: Tnex,
    }
  }
}
