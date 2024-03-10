import { createHash } from "crypto";
import { buildLogger } from "../../infra/logging/buildLogger.js";

const logger = buildLogger("AccessTokenLoader");

/**
 * Given an incoming list of scopes, returns a Set containing those scopes.
 * Caches the results of these calls so subsequent calls with the same scopes
 * (in any order) return the same Set instance.
 *
 * This is an important memory optimization since _most_ but not all of our
 * access tokens will have the same set of scopes and we don't want to duplicate
 * storage for each of them.
 */
export class ScopeSetCache {
  private cachedScopeSets = new Map<string, Set<string>>();

  getScopeSet(scopes: string[]) {
    scopes.sort();

    const scopeHash = createHash("md5").update(scopes.join(",")).digest("hex");

    let scopeSet = this.cachedScopeSets.get(scopeHash);
    if (scopeSet == null) {
      logger.info(
        `Storing new scope set of ${scopes.length} scopes with hash` +
          ` ${scopeHash}`,
      );
      scopeSet = new Set(scopes);
      this.cachedScopeSets.set(scopeHash, scopeSet);
    }
    return scopeSet;
  }
}
