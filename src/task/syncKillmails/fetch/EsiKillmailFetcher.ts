import { VError } from "verror";
import { OrderedParallelTransform } from "../../../util/stream/OrderedParallelTransform";
import {
  ZKillmail,
  ZKillDescriptor,
} from "../../../data-source/zkillboard/ZKillmail";
import { ESI_KILLMAILS_$killmailId_$killmailHash } from "../../../data-source/esi/endpoints";
import { EsiKillmail } from "../../../data-source/esi/EsiKillmail";
import { AxiosError } from "axios";
import { Logger } from "../../../infra/logging/Logger";
import { fetchEsi } from "../../../data-source/esi/fetch/fetchEsi";

/**
 * Given a stream of ZKillDesciptors, fetches the associated EsiKillmail and
 * combines them into a ZKillmail.
 *
 * ZKillboard used to return both the descriptor and the killmail in a single
 * query; now we have to fetch them separately and combine them.
 */
export class EsiKillmailFetcher extends OrderedParallelTransform<
  ZKillDescriptor,
  ZKillmail
> {
  private readonly _logger: Logger;
  private _closed = false;
  private _fetchCount = 0;

  constructor(logger: Logger, concurrency: number) {
    super(concurrency);
    this._logger = logger;
  }

  close() {
    this._closed = true;
  }

  getFetchCount() {
    return this._fetchCount;
  }

  protected async _processChunk(
    chunk: ZKillDescriptor
  ): Promise<ZKillmail | null> {
    if (this._closed) {
      return null;
    }
    const esiMail = await this._fetchMail(
      chunk.killmail_id,
      chunk.zkb.hash,
      MAX_FAILURES_PER_REQUEST
    );
    this._fetchCount++;
    return combineKillmails(esiMail, chunk);
  }

  private async _fetchMail(id: number, hash: string, maxFailures: number) {
    let failures = 0;
    while (true) {
      try {
        return await fetchEsi(ESI_KILLMAILS_$killmailId_$killmailHash, {
          killmailId: id,
          killmailHash: hash,
        });
      } catch (e) {
        failures++;
        const cause = VError.cause(e) as AxiosError | null;
        if (
          failures <= maxFailures &&
          cause != null &&
          cause.response != null &&
          cause.response.status >= 500
        ) {
          // Try again
          this._logger.info(
            `FAILURE ${failures} (max ${maxFailures}) for` +
              ` killmail ${id}, "${cause.response.statusText}", retrying...`
          );
        } else {
          throw e;
        }
      }
    }
  }
}

function combineKillmails(
  km: EsiKillmail,
  descriptor: ZKillDescriptor
): ZKillmail {
  const zkm = km as ZKillmail;
  zkm.zkb = descriptor.zkb;
  return zkm;
}

const MAX_FAILURES_PER_REQUEST = 2;
