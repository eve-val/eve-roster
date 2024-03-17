import { Tnex } from "../../db/tnex/Tnex.js";
import { dao } from "../../db/dao.js";
import { EsiEntity, esiChar as esiChar } from "../esi/EsiEntity.js";
import { fetchAccessTokenResult } from "./accessToken.js";
import { EsiScope } from "../esi/EsiScope.js";
import {
  AccessTokenResult,
  TokenResultType,
  accessTokenResultToString,
} from "./AccessTokenResult.js";
import { isAnyEsiError } from "../esi/error.js";
import { EsiErrorKind } from "../esi/EsiError.js";
import { Logger } from "../../infra/logging/Logger.js";
import { Result, failure, success } from "../../util/Result.js";

/**
 * Given a corporation, retrives a director's access token and runs [executor].
 * Iterates through directors until it finds one with sufficient access scopes
 * to perform the action.
 *
 * In most cases, if [executor] throws an error, execution will cease and the
 * the error will be propagated upwards to the caller of this function.
 * However, if the thrown error is an EsiError with kind FORBIDDEN_ERROR,
 * [executor] will be called again with the next valid director's token. This
 * behavior exists to address situations where a character has recently lost
 * the director role but that information has not yet been propagated to our
 * systems (in particular, because the job task that does so requires director
 * tokens to function).
 */
export async function runAsDirector<T>(
  db: Tnex,
  log: Logger,
  corp: EsiEntity,
  requiredScopes: EsiScope[],
  executor: (token: string, director: EsiEntity) => T | Promise<T>,
): Promise<T> {
  return (
    await tryAsDirector(db, log, corp, requiredScopes, executor)
  ).unwrap();
}

/**
 * The same as {@link runAsDirector}, but returns a {@link Result} rather than
 * throwing an error if execution fails.
 */
export async function tryAsDirector<T>(
  db: Tnex,
  log: Logger,
  corp: EsiEntity,
  requiredScopes: EsiScope[],
  executor: (token: string, director: EsiEntity) => T | Promise<T>,
): Promise<Result<T>> {
  const directorRows = await dao.roster.getCorpDirectors(db, corp.id);

  const tokenResults: [EsiEntity, AccessTokenResult, boolean][] = [];

  for (const row of directorRows) {
    const director = esiChar(row.character_id, row.character_name);
    const tokenResult = await fetchAccessTokenResult(
      db,
      director.id,
      requiredScopes,
    );
    tokenResults.push([director, tokenResult, false]);
    if (tokenResult.kind != TokenResultType.SUCCESS) {
      continue;
    }
    try {
      return success(await executor(tokenResult.token, director));
    } catch (e) {
      if (isAnyEsiError(e) && e.kind == EsiErrorKind.FORBIDDEN_ERROR) {
        log.error(
          `FORBIDDEN error while executing job on behalf of director` +
            ` ${director} for ${corp}`,
          e,
        );
        tokenResults[tokenResults.length - 1][2] = true;
        continue;
      } else {
        return failure(e);
      }
    }
  }

  const messages: string[] = [];
  for (const [director, result, wasForbidden] of tokenResults) {
    let message = `${director}: ${accessTokenResultToString(result)}`;
    if (wasForbidden) {
      message += ` (*threw forbidden error)`;
    }
    messages.push(message);
  }
  let errorMessage =
    `No valid director tokens to complete action.` +
    ` (${messages.length} total)`;
  if (messages.length > 0) {
    errorMessage += `\n${messages.join("\n")}`;
  }

  return failure(new Error(errorMessage));
}
