import querystring = require('querystring');

import Bluebird = require('bluebird');
import moment = require('moment');
import { default as axiosModule, AxiosResponse } from 'axios';
import tough = require('tough-cookie');

import { Tnex } from '../db/tnex';
import { dao } from '../db/dao';
import { character } from '../db/tables';
import { MixedObject, SimpleNumMap } from '../util/simpleTypes';
import { JobLogger } from '../infra/taskrunner/Job';
import { buildLoggerFromFilename } from '../infra/logging/buildLogger';

// TODO: These packages don't have type declarations yet
const htmlparser = require('htmlparser');
const select = require('soupselect').select;

const logger = buildLoggerFromFilename(__filename);

const SIGGY_CONFIG_ERROR = 'Siggy credentials have not been set.';
const SIGGY_PATH = 'https://siggy.borkedlabs.com';

// Currently the siggy leaderboard has 8 columns
const SIGGY_TABLE_COLUMN_CT = 8;
// And the score we are interested in is the last column
const SIGGY_SCORE_COLUMN = 7;

const axios = axiosModule.create({
  baseURL: SIGGY_PATH
});

export function syncSiggy(db: Tnex, job: JobLogger) {
  return Promise.resolve()
  .then(_ => resetSavedScores(db))
  .then(_ => getSiggyCredentials(db))
  .then(config => handleLogin(config))
  .then(cookieJar => getRecentScores(cookieJar))
  .then(recentScores => saveScrapedScores(db, recentScores))
  .then((updateCount) => {
    logger.info(`Updated ${updateCount} characters`);
  })
  .catch(error => {
    if (error instanceof Error && error.message === SIGGY_CONFIG_ERROR) {
      job.warn(SIGGY_CONFIG_ERROR);
    } else {
      throw error;
    }
  });
}

// Set all siggy scores to 0 in database, so that anyone not present in
// scraped leaderboards has the expected score of 0.
function resetSavedScores(db: Tnex) {
  return db.transaction(db => {
    return db
      .update(character, { character_siggyScore: 0 })
      .run();
  });
}

function saveScrapedScores(db: Tnex, recentScores: SiggyScore[]) {
  return db.transaction(db => {
    return Bluebird.map(recentScores, (score) => {
      return dao.character.updateCharacter(db, score.id, {
        // Schema currently stores integers, so convert the floating point
        // scraped score
        character_siggyScore: Math.round(score.score)
      });
    });
  })
  .then((updates) => {
    return updates.reduce((a, b) => a + b, 0);
  });
}

function getSiggyCredentials(db: Tnex) {
  return dao.config.getSiggyCredentials(db);
}

// siggy tracks login status through its session, stored in a cookie with the
// request; however, it also uses a token generated when first visiting the
// login form to validate POST requests completing the form.
// handleLogin() is a one-stop-shop to login and return the final state of
// a cookie jar that can be used for authenticated requests to siggy.
function handleLogin(config: {username: string|null, password: string|null}) {
  if (!config.username || !config.password) {
    throw new Error(SIGGY_CONFIG_ERROR);
  }

  let cookies = new tough.CookieJar();

  // Initiate login flow with a get request to the form's page
  return axios.get('/account/login').then(response => {
    updateCookies(cookies, response);

    // Do a simpler regex matching to strip out the token value instead of
    // full dom parsing.
    let tokenPattern = /input name="_token" type="hidden" value="(\w+)"/
    let matches = response.data.match(tokenPattern);
    if (matches) {
      return matches[1];
    } else {
      throw new Error('Unable to extract Siggy _token');
    }
  })
  .then(token => {
    // Make a POST to the login URL with the provided token and credentials
    let formData = querystring.stringify({
      username: config.username,
      password: config.password,
      _token: token
    });

    return axios.post('/account/login', formData, {
      maxRedirects: 0,
      validateStatus: status => status == 302,
      headers: {
        'Cookie': cookies.getCookieStringSync(SIGGY_PATH)
      }
    });
  })
  .then(response => {
    // On a successful login the response is a 302, which is already confirmed
    // by axios' built-in validateStatus setting. All that is left is to
    // return the updated cookie jar
    updateCookies(cookies, response);
    return cookies;
  });
}

// Update a cookie jar based on a response
function updateCookies(cookieJar: tough.CookieJar,
    response: AxiosResponse) {
  // Parse the set-cookie header in the response
  let cookies: Array<tough.Cookie | undefined>;
  if (response.headers && 'set-cookie' in response.headers) {
    if (response.headers['set-cookie'] instanceof Array) {
      cookies = response.headers['set-cookie'].map(tough.Cookie.parse);
    } else {
      cookies = [tough.Cookie.parse(response.headers['set-cookie'])];
    }
  } else {
    cookies = [];
  }

  // And store them into the jar
  for (let cookie of cookies) {
    if (cookie != undefined) {
      cookieJar.setCookieSync(cookie, SIGGY_PATH, {});
    }
  }
}

// Resolve to webpage content (parsed by htmlparser) of siggy's weekly stat page
function getLeaderboardPage(
    year: number,
    weekInYear: number,
    page: number,
    cookieJar: tough.CookieJar,
    ) {

  let params = {} as MixedObject;
  params['year'] = year;
  params['week'] = weekInYear;
  if (page) {
    params['page'] = page;
  }

  return Bluebird.resolve()
  .then(() => {
    return axios.get('/stats/leaderboard/', {
      params: params,
      headers: {
        'Cookie': cookieJar.getCookieStringSync(SIGGY_PATH)
      }
    })
  })
  .then(response => {
    updateCookies(cookieJar, response);
    return response;
  })
  .then(parseLeaderboardPage);
}

// Parse the html DOM into a usable object
function parseLeaderboardPage(response: AxiosResponse): PageDom {
  let parseResult: PageDom;
  let parseError: Error | null = null;

  // The parsing uses a callback but happens synchronously when parseComplete
  // is called, so the handler just extracts the parsed dom into the local
  // variable for subsequent returns (or the error for failing).
  let parser = new htmlparser.Parser(new htmlparser.DefaultHandler(
      (err: Error, dom: PageDom) => {
        if (err) {
          parseError = err;
        } else {
          parseResult = dom;
        }
      }));
  parser.parseComplete(response.data);

  if (parseError) {
    throw parseError;
  } else {
    if (parseResult instanceof Array) {
      for (let body of parseResult) {
        if (body.name == 'html') {
          return body;
        }
      }
    } else if (parseResult.name == 'html') {
      return parseResult;
    }

    throw new Error('Unable to parse html response, missing \'html\' tag');
  }
}

function getCharacterIDFromPortraitURL(url: string) {
  let lastPath = url.lastIndexOf('/');
  let suffix = url.lastIndexOf('_32.jpg');
  if (lastPath >= 0 && suffix >= 0) {
    return Number.parseInt(url.substring(lastPath + 1, suffix));
  } else {
    return undefined;
  }
}

function extractPoints(dom: PageDom) {
  let charMap = {} as SimpleNumMap<number>;
  // The siggy page does not include element ids or very descriptive classes,
  // so selecting for table rows brings in more rows than what actually hold
  // character data.
  let tableRows = select(dom, 'table.table.table-striped tr');
  if (tableRows.length == 0) {
    throw new Error(
        'siggy leaderboard DOM appears to have changed: missing table');
  }

  for (let row of tableRows) {
    // Character rows have a column that stores an image
    let portrait = select(row, 'td img');
    if (portrait.length == 0) {
      continue;
    }

    // And the image source ends with _32.jpg, so if that isn't included then
    // assume the image was representing something other than a character
    // portrait
    let charID = getCharacterIDFromPortraitURL(portrait[0].attribs['src']);
    if (!charID) {
      continue;
    }

    // The score is in the last td of the row
    let tds = select(row, 'td');
    if (tds.length != SIGGY_TABLE_COLUMN_CT) {
      // At this point, an unexpected count most likely means that siggy has
      // changed their page so an exception should be thrown so this script can
      // be updated ASAP.
      throw new Error('siggy leaderboard DOM appears to have changed: missing '
              + ' score column');
    }
    let rawScore = tds[SIGGY_SCORE_COLUMN];
    if (rawScore.children.length != 1 || rawScore.children[0].type != 'text') {
      throw new Error('siggy leaderboard DOM appears to have changed: unable to'
          + ' parse score');
    }

    charMap[charID] = Number.parseFloat(rawScore.children[0].data);
  }

  return charMap;
}

/*
 * Assumes 1-indexing for page instead of starting at 0
 */
function isLastPage(dom: PageDom, page: number) {
  // This will return the pagination widget, if present. For pages with fewer
  // than the character page limit the widget is omitted.
  let pages = select(dom, 'ul.pagination');
  if (pages.length == 0) {
    // No more than one page, so any page is the last page basically
    return true;
  }

  // At least one widget (but probably two, one for top and bottom of page).
  // The provided page is last if it is greater than or equal to the length of
  // the li's in the widget. This does not confirm that the last li has the
  // active class applied to it.
  return page >= select(pages[0], 'li').length;
}

/*
 * Load the entire table for a given time period (fetching all pages as needed)
 * and scrape the HTML to return a map from character ID to siggy net score.
 */
function getLeaderboard(
    year: number, weekInYear: number, cookieJar: tough.CookieJar) {
  logger.info(`Scraping scores for ${year} - ${weekInYear}`);

  function _getPageScores(page: number): Bluebird<SimpleNumMap<number>> {
    return getLeaderboardPage(year, weekInYear, page, cookieJar)
      .then(dom => {
        let currentScores = extractPoints(dom);
        if (isLastPage(dom, page)) {
          // Just return the scores as is
          return Bluebird.resolve(currentScores);
        } else {
          // Fetch next page for the year/week
          return _getPageScores(page + 1)
            .then(lowerScores => {
              // Merge the two maps (shouldn't have any overlapping character
              // IDs)
              for (let char in lowerScores) {
                if (!lowerScores.hasOwnProperty(char))
                  continue;

                // Don't overwrite scores from an earlier page, this one is
                // either the same or lower (although this scenario would only
                // happen if a character's position changed between page
                // fetches)
                if (!(char in currentScores)) {
                  currentScores[char] = lowerScores[char];
                }
              }
              return Bluebird.resolve(currentScores);
            });
        }
      });
  };

  // Start by fetching the first page of scores
  return _getPageScores(1);
}

/*
 * Calculate recent siggy scores over the last 55 to 61 days. Since siggy is
 * fixed to calendar weeks and weeks are its lowest resolution, this combines
 * the last 7-8 calendar weeks into a single score per character.
 * Week break down based on day into the week:
 *   1 -> 0 full days + prior eight weeks = 56 days
 *   2 -> 1 full day + prior eight weeks = 57 days
 *   3 -> 2 full days + prior eight weeks = 58 days
 *   4 -> 3 full days + prior eight weeks = 59 days
 *   5 -> 4 full days + prior eight weeks = 60 days
 *   6 -> 5 full days + prior eight weeks = 61 days
 *   7 -> 6 full days + prior seven weeks = 55 days
 *
 * Resolves to an array of {id: characterID, score: Number}, sorted with
 * highest score first.
 */
function getRecentScores(cookieJar: tough.CookieJar) {
  // Using utc time for now, assuming that siggy's date breakdowns are based on
  // Eve time...
  let now = moment.utc([]);
  let dayOfWeek = now.day(); // This is 0-based, Sunday = 0
  let weekOfYear = now.week();
  let year = now.year();

  let work = [];
  let daysFetched = dayOfWeek;

  // Get the current week's stats
  work.push(getLeaderboard(year, weekOfYear, cookieJar));

  // Get prior full weeks until approximately a month has passed
  while (daysFetched < 55) {
    weekOfYear = weekOfYear - 1;
    if (weekOfYear < 1) {
      weekOfYear = 52;
      year = year - 1;
    }

    work.push(getLeaderboard(year, weekOfYear, cookieJar));
    daysFetched += 7;
  }
  logger.info(`Siggy scores based on last ${daysFetched} days`);

  return Bluebird.all(work).then((weeklyScores) => {
    // Join all per-week scores into a summed score per character
    let totalScores = {} as { [key: number]: number };
    for (let perWeek of weeklyScores) {
      for (let id in perWeek) {
        if (!perWeek.hasOwnProperty(id)) {
          continue;
        }

        if (id in totalScores) {
          totalScores[id] = totalScores[id] + perWeek[id];
        } else {
          totalScores[id] = perWeek[id];
        }
      }
    }

    let sorted = [];
    for (let id in totalScores) {
      sorted.push({id: parseInt(id), score: totalScores[id]});
    }
    sorted.sort((a, b) => {
      if (a.score > b.score)
        return -1;
      else if (a.score < b.score)
        return 1;
      else
        return 0;
    });

    return sorted;
  });
}

type PageDom = any;

interface SiggyScore {
  id: number;
  score: number;
}
