import { nil } from "../../../shared/util/simpleTypes.js";
import { fetchEveNames } from "./names.js";

/**
 * Simple wrapper for {@link fetchEveNames}.
 */
export class EsiNameFetcher {
  private ids = new Set<number>();

  constructor(iterable: Iterable<number> | null = null) {
    if (iterable) {
      for (const id of iterable) {
        this.addId(id);
      }
    }
  }

  addId(id: number | nil) {
    if (id != null) {
      this.ids.add(id);
    }
  }

  fetch() {
    return fetchEveNames(this.ids);
  }
}
