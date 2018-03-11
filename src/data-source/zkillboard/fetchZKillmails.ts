import moment = require('moment');

import axios from 'axios';
import { delay } from '../../util/asyncUtil';
import { makePlanetaryInteraction } from 'eve-swagger/dist/src/api/universe/planetary-interaction';
import { ZKillmail } from './ZKillmail';
import { JobTracker } from '../../cron/Job';


const BASE_ZKILL_API_URL = 'https://zkillboard.com/api/';
const PAGE_FETCH_DELAY = 500;

/**
 * Loads all killmails from a particular zkillboard query.
 *
 * By default loads all pages from the query (up to a default maximum of
 * 10 pages) and returns them in a single array.
 *
 * If timestamp bounds are set, fetches pages until it encounters a mail that
 * lies outside of the timestamp bounds. Mails outside the bounds will not be
 * included in the returned array. This behavior assumes that the returned
 * results are ordered by timestamp.
 */
export async function fetchZKillmails(url: string, bounds?: FetchBounds) {
  let fullUrl = `${BASE_ZKILL_API_URL}${url}`;
  if (!fullUrl.endsWith('/')) {
    fullUrl += '/';
  }
  const maxPages = bounds && bounds.maxPages ? bounds.maxPages : 10;

  let mails: ZKillmail[] = [];

  let currPage = 1;
  while (true) {
    const response = await axios.get(`${fullUrl}page/${currPage}/`, {
      headers: {
        'User-Agent': process.env.USER_AGENT || 'Sound Roster App',
        'Accept-Encoding': 'gzip',
      }
    });
    const page: ZKillmail[] = response.data;

    if (page.length > 0) {
      let outOfBounds = false;
      for (let mail of page) {
        if (withinBounds) {
          mails.push(mail);
        } else {
          outOfBounds = true;
          break;
        }
      }
      currPage++;
      outOfBounds = outOfBounds || currPage > maxPages;
      if (outOfBounds) {
        break;
      }
      await delay(PAGE_FETCH_DELAY);
    } else {
      break;
    }
  }

  return mails;
}

export interface FetchBounds {
  maxTimestamp?: number,
  minTimestamp?: number,
  maxPages?: number,
}

function withinBounds(km: ZKillmail, bounds: FetchBounds) {
  const timestamp = moment.utc(km.killmail_time).valueOf();

  if (bounds.minTimestamp != undefined && timestamp < bounds.minTimestamp) {
    return false;
  }
  if (bounds.maxTimestamp != undefined && timestamp > bounds.maxTimestamp) {
    return false;
  }
}
