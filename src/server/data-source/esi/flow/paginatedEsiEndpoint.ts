import { flow } from "../../../util/flow/flow.js";
import { EsiEndpoint } from "../EsiEndpoint.js";
import { EsiEndpointParams } from "../fetch/EsiEndpointParams.js";
import { fetchEsiEx } from "../fetch/fetchEsi.js";

/**
 * Exposes a paginated ESI endpoint as a flow source
 *
 * Provided an ESI endpoint that is paginated (i.e. returns an array of data
 * split across multiple pages), creates a flow that emits elements in order
 * from those pages, advancing pages when necessary.
 *
 * Respects backpressure, so new pages are only fetched when old ones are
 * completely consumed.
 */
export function paginatedEsiEndpoint<T extends ArrayEsiEndpoint>(
  endpoint: T,
  params: Omit<EsiEndpointParams<T>, "page">,
  maxAttempts = 2,
) {
  return flow.defineSource<EndpointRowItem<T>>((node) => {
    let nextPage = 1;
    let maxPages = 1;

    const activeParams = Object.assign({ page: nextPage }, params);

    return {
      async onRead() {
        if (nextPage > maxPages) {
          node.close();
          return;
        }
        activeParams.page = nextPage;

        const pageResult = await fetchEsiEx(
          endpoint,
          activeParams as EsiEndpointParams<T>,
          maxAttempts,
        );

        maxPages = pageResult.pageCount;
        const items = pageResult.data;
        for (const item of items) {
          node.emit(item);
        }

        nextPage++;
      },
    };
  });
}

interface ArrayEsiEndpoint extends EsiEndpoint {
  response: unknown[];
  query: {
    page: number;
  };
}

type EndpointRowItem<T extends ArrayEsiEndpoint> = T["response"][0];
