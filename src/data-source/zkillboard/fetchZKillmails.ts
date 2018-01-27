import axios from 'axios';
import { delay } from '../../util/asyncUtil';
import { makePlanetaryInteraction } from 'eve-swagger/dist/src/api/universe/planetary-interaction';
import { ZKillmail } from './ZKillmail';
import { JobTracker } from '../../cron/Job';


const BASE_ZKILL_API_URL = 'https://zkillboard.com/api/';

/**
 * Loads all killmails from a particular zkillboard query. Loads all pages
 * and returns them in a single array.
 */
export async function fetchZKillmails(url: string, pageDelay = 500) {
  let fullUrl = `${BASE_ZKILL_API_URL}${url}`;
  if (!fullUrl.endsWith('/')) {
    fullUrl += '/';
  }

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
      for (let mail of page) {
        mails.push(mail);
      }
      currPage++;
      await delay(pageDelay);
    } else {
      break;
    }
  }

  return mails;
}
