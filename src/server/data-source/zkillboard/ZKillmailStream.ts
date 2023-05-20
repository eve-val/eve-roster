import { Readable } from "../../util/stream/Readable.js";
import { ZKillDescriptor } from "./ZKillmail.js";
import { fetchZKillResultPage } from "./fetchZKillResultPage.js";

/**
 * Readable stream representing a query for a ZKillboard API.
 *
 * Unrolls the paginated results into a single, continuous stream.
 *
 * IMPORTANT: Due to the paginated nature of the source data, it's possible to
 * get duplicate entries in the stream if the data changes while the stream is
 * read.
 */
export class ZKillmailStream extends Readable<ZKillDescriptor> {
  private readonly _url: string;
  private readonly _maxPages: number | null;
  private _closed = false;
  private _nextPage = 1;

  constructor(url: string, maxPages: number | null = null) {
    super({
      objectMode: true,
    });

    this._url = url;
    this._maxPages = maxPages;
  }

  _read(_size: number) {
    this._performRead().catch((err) => {
      this.emit("error", err);
    });
  }

  /**
   * Stops any further data from being fetched. Queued data will still drain,
   * so it is possible for data to be emitted after this method is called.
   */
  close() {
    this._closed = true;
  }

  private async _performRead() {
    if (this._closed) {
      this.push(null);
    } else if (this._maxPages != null && this._nextPage >= this._maxPages) {
      this.push(null);
    } else {
      const kmds = await fetchZKillResultPage(this._url, this._nextPage);
      this._nextPage++;
      if (kmds.length == 0) {
        this.push(null);
      } else {
        for (const kmd of kmds) {
          this.push(kmd);
        }
      }
    }
  }
}
