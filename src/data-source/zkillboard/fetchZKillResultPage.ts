import * as util from "util";
import axios from "axios";
import { ZKillDescriptor } from "./ZKillmail";
import { RateLimiter } from "../../util/RateLimiter";

/**
 * Fetches a specific page of a specific ZKill URL.
 *
 * This method enforces a global rate-limit so that ZKill won't reject requests
 * (see PAGE_FETCH_DELAY_MS). Requests will be queued until their turn comes.
 */
export async function fetchZKillResultPage(url: string, page: number) {
  await _rateLimiter.ready();

  let fullUrl = `${BASE_ZKILL_API_URL}${url}`;
  if (!fullUrl.endsWith("/")) {
    fullUrl += "/";
  }

  const response =
    // TODO: Add a timeout so we don't queue these forever
    await axios.get<ResultResponse>(`${fullUrl}page/${page}/`, {
      headers: {
        "User-Agent": process.env.USER_AGENT || "Sound Roster App",
        "Accept-Encoding": "gzip",
      },
    });

  if (isErrorResponse(response.data)) {
    throw new Error(`Error from ZKillboard: ${response.data.error}`);
  } else if (!(response.data instanceof Array)) {
    throw new Error(
      `Unexpected response from ZKillboard: "${util.inspect(response)}"`
    );
  }

  return response.data;
}

function isErrorResponse(response: ResultResponse): response is ErrorResponse {
  return (<ErrorResponse>response).error != undefined;
}

type ResultResponse = ZKillDescriptor[] | ErrorResponse;
interface ErrorResponse {
  error: string;
}

const BASE_ZKILL_API_URL = "https://zkillboard.com/api/";
const PAGE_FETCH_DELAY_MS = 2400;
const _rateLimiter = new RateLimiter(PAGE_FETCH_DELAY_MS);
