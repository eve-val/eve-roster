import { Tnex } from "../../db/tnex/Tnex.js";
import { Puggle } from "./puggle.js";

/**
 * A context object made avaiable to all express route handlers
 *
 * Available via req.app.locals.context
 *
 * Really we should be using dependency injection to get these in here, but
 * here we are.
 *
 * Forgive me, lord of encapsulation, for creating this god object in mockery
 * of your magnificence
 */
export interface EndpointContext {
  db: Tnex;
  puggle: Puggle;
}
