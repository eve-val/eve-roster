const Promise = require('bluebird');

const querystring = require('querystring');
const htmlparser = require('htmlparser');
const moment = require('moment');
const select = require('soupselect').select;
const tough = require('tough-cookie');

const dao = require('../../dao');
const logger = require('../../util/logger')(__filename);


const SIGGY_PATH = 'https://siggy.borkedlabs.com';
const SIGGY_HEADERS = ['session', 'sessionID', 'userID', 'passHash'];

// Currently the siggy leaderboard has 8 columns
const SIGGY_TABLE_COLUMN_CT = 8;
// And the score we are interested in is the last column
const SIGGY_SCORE_COLUMN = 7;

const axios = require('axios').create({
  baseURL: SIGGY_PATH
});


module.exports = function syncSiggy() {
  return Promise.resolve()
  .then(resetSavedScores)
  .then(postLogin)
  .then(getLoginCookies)
  .then(validateLogin)
  .then(getRecentScores)
  .then(saveScrapedScores)
  .then((updateCount) => {
    logger.info('Updated', updateCount, 'characters');
    // Always return success since siggy only reports characters that scanned,
    // so missing characters is expected
    return 'success';
  });
};

// Set all siggy scores to 0 in database, so that anyone not present in
// scraped leaderboards has the expected score of 0.
function resetSavedScores() {
  return dao.transaction((trx) => {
    return trx.builder('character').update({ siggyScore: 0 });
  });
}

function saveScrapedScores(recentScores) {
  return dao.transaction((trx) => {
    return Promise.map(recentScores, (score) => {
      return trx.updateCharacter(score.id, {
        // Schema currently stores integers, so convert the floating point
        // scraped score
        siggyScore: Math.round(score.score)
      });
    });
  })
  .then((updates) => {
    return updates.reduce((a, b) => a + b, 0);
  });
}

// Initiate login with siggy site using an existing account credentials
function postLogin() {
  return dao.getConfig('siggyUsername', 'siggyPassword')
  .then(config => {
    if (!config.siggyUsername || !config.siggyPassword) {
      throw new Error('Siggy credentials have not been set.');
    }

    let formData = querystring.stringify({
      username: config.siggyUsername,
      password: config.siggyPassword,
    });

    return axios.post('/account/login', formData, {
      maxRedirects: 0,
      validateStatus: status => status == 302
    });
  })
  
}

// Return all cookies in a set-cookie header of the response
function getLoginCookies(response) {
  if (response.headers && 'set-cookie' in response.headers) {
    if (response.headers['set-cookie'] instanceof Array) {
      return response.headers['set-cookie'].map(tough.Cookie.parse);
    } else {
      return [tough.Cookie.parse(response.headers['set-cookie'])];
    }
  } else {
    return [];
  }
}

// Make sure cookies have session, sessionID, userID, and passHash or assume
// that something has gone wrong with the login process.
// If valid, resolves to a tough.CookieJar with all the cookies in it
function validateLogin(cookies) {
  // First search for all required cookie keys
  for (let key of SIGGY_HEADERS) {
    let found = false;
    for (let cookie of cookies) {
      if (cookie.key == key) {
        found = true;
        break;
      }
    }

    if (!found) {
      throw new Error('Missing required cookie from siggy response: ${key}');
    }
  }

  // Made it here, so all required cookies were found and can store in a jar
  let jar = new tough.CookieJar();
  for (let cookie of cookies) {
    jar.setCookieSync(cookie, SIGGY_PATH);
  }

  return jar;
}

// Resolve to webpage content (parsed by htmlparser) of siggy's weekly stat page
function getLeaderboardPage(year, weekInYear, page, cookieJar) {
  // The week must be two digits or siggy doesn't understand the URL properly
  let week = weekInYear < 10 ? '0' + weekInYear : weekInYear.toString();
  let path = '/stats/leaderboard/year/' + year + '/week/' + week;
  let params = {};
  if (page) {
    params['page'] = page;
  }

  return axios.get(path, {
    params: params,
    headers: {
      'Cookie': cookieJar.getCookieStringSync(SIGGY_PATH)
    }
  }).then(parseLeaderboardPage);
}

// Parse the html DOM into a usable object
function parseLeaderboardPage(response) {
  let parseResult = null;
  let parseError = null;

  // The parsing uses a callback but happens synchronously when parseComplete
  // is called, so the handler just extracts the parsed dom into the local
  // variable for subsequent returns (or the error for failing).
  let parser = new htmlparser.Parser(new htmlparser.DefaultHandler((err, dom) => {
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

function getCharacterIDFromPortraitURL(url) {
  let lastPath = url.lastIndexOf('/');
  let suffix = url.lastIndexOf('_32.jpg');
  if (lastPath >= 0 && suffix >= 0) {
    return Number.parseInt(url.substring(lastPath + 1, suffix));
  } else {
    return undefined;
  }
}

function extractPoints(dom) {
  let charMap = {};
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
function isLastPage(dom, page) {
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
function getLeaderboard(year, weekInYear, cookieJar) {
  logger.info('Scraping scores for', year, '-', weekInYear);

  let _getPageScores = function(page) {
    return getLeaderboardPage(year, weekInYear, page, cookieJar)
      .then((dom) => {
        let currentScores = extractPoints(dom);
        if (isLastPage(dom, page)) {
          // Just return the scores as is
          return Promise.resolve(currentScores);
        } else {
          // Fetch next page for the year/week
          return _getPageScores(page + 1)
            .then((lowerScores) => {
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
              return Promise.resolve(currentScores);
            });
        }
      });
  };

  // Start by fetching the first page of scores
  return _getPageScores(1);
}

/*
 * Calculate recent siggy scores over the last 27 to 33 days. Since siggy is
 * fixed to calendar weeks and weeks are its lowest resolution, this combines
 * the last 4-5 calendar weeks into a single score per character.
 * Week break down based on day into the week:
 *   1 -> 0 full days + prior four weeks = 28 days
 *   2 -> 1 full day + prior four weeks = 29 days
 *   3 -> 2 full days + prior four weeks = 30 days
 *   4 -> 3 full days + prior four weeks = 31 days
 *   5 -> 4 full days + prior four weeks = 32 days
 *   6 -> 5 full days + prior four weeks = 33 days
 *   7 -> 6 full days + prior three weeks = 27 days
 *
 * Resolves to an array of {id: characterID, score: Number}, sorted with
 * highest score first.
 */
function getRecentScores(cookieJar) {
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
  while (daysFetched < 27) {
    weekOfYear = weekOfYear - 1;
    if (weekOfYear < 1) {
      weekOfYear = 52;
      year = year - 1;
    }

    work.push(getLeaderboard(year, weekOfYear, cookieJar));
    daysFetched += 7;
  }
  logger.info('Siggy scores based on last', daysFetched, 'days');

  return Promise.all(work).then((weeklyScores) => {
    // Join all per-week scores into a summed score per character
    let totalScores = {};
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
      sorted.push({id: id, score: totalScores[id]});
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
