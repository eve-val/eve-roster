import Bluebird from "bluebird";
import moment from "moment";
import { default as axios } from "axios";

import { dao } from "../db/dao.js";
import { Tnex } from "../db/tnex/index.js";
import { serialize } from "../util/asyncUtil.js";
import { JobLogger } from "../infra/taskrunner/Job.js";
import { fileURLToPath } from "url";
import { buildLoggerFromFilename } from "../infra/logging/buildLogger.js";
import { Task } from "../infra/taskrunner/Task.js";

const logger = buildLoggerFromFilename(fileURLToPath(import.meta.url));

export const syncCombatStats: Task = {
  name: "syncCombatStats",
  displayName: "Sync combat activity",
  description: "Updates members' recent kills/losses.",
  timeout: moment.duration(4, "hours").asMilliseconds(),
  executor,
};

const PROGRESS_INTERVAL_PERC = 0.05;
const ZKILL_MAX_RESULTS_PER_PAGE = 200;
const MAX_FAILURES_BEFORE_BAILING = 10;

function executor(db: Tnex, job: JobLogger) {
  const window = moment().subtract(1, "month");
  return fetchAll(db, job, window.year(), 1 + window.month()).then(
    ([updateCount, failureCount]) => {
      logger.info(`Updated ${updateCount} characters' killboards.`);
      if (failureCount > 0 && updateCount == 0) {
        throw new Error(`syncCombatStats failed completely.`);
      } else if (failureCount > 0 && updateCount > 0) {
        job.warn(`Failed to update ${failureCount} character killboards.`);
      }
    }
  );
}

// For each character, fetches their killboard stats and stores them.
function fetchAll(db: Tnex, job: JobLogger, year: number, month: number) {
  return dao.combatStats
    .getAllCharacterCombatStatsTimestamps(db)
    .then((rows) => {
      let currentProgress = 0;
      let updateCount = 0;
      let failureCount = 0;
      return serialize(rows, (row, idx) => {
        if (
          row.cstats_updated &&
          moment(row.cstats_updated).month() == moment().month()
        ) {
          // Updated this month already, skip.
          return;
        }
        currentProgress = logProgressUpdate(
          job,
          currentProgress,
          idx,
          rows.length
        );
        return syncCharacterKillboard(
          db,
          row.character_id,
          row.character_name,
          year,
          month
        )
          .then(() => {
            updateCount++;
          })
          .catch((e) => {
            logger.warn(
              `Error fetching killboard for ${row.character_name}:`,
              e
            );
            failureCount++;
            if (failureCount > MAX_FAILURES_BEFORE_BAILING) {
              throw new Error(
                "syncCombatStats aborted (failure count too high)"
              );
            }
          });
      }).then(() => {
        return [updateCount, failureCount];
      });
    });
}

function syncCharacterKillboard(
  db: Tnex,
  characterId: number,
  characterName: string,
  year: number,
  month: number
) {
  return serialize(["kills", "losses"], (kind) =>
    fetchMails(kind, characterId, year, month)
  )
    .then(([kills, losses]) => {
      const killCount = kills.length;
      const lossCount = losses.length;

      const killValue = Math.round(
        kills.reduce((accum, kill) => accum + kill.zkb.totalValue, 0)
      );
      const lossValue = Math.round(
        losses.reduce((accum, loss) => accum + loss.zkb.totalValue, 0)
      );

      return dao.combatStats.updateCharacterCombatStats(
        db,
        characterId,
        killCount,
        lossCount,
        killValue,
        lossValue
      );
    })
    .then(async () => {
      // Add another delay to avoid spamming zKill too much
      await Bluebird.delay(10000);
    });
}

function logProgressUpdate(
  job: JobLogger,
  lastLoggedProgress: number,
  idx: number,
  length: number
) {
  const progress = Math.floor(idx / length / PROGRESS_INTERVAL_PERC);
  if (progress > lastLoggedProgress || idx == 0) {
    const perc = Math.round(100 * lastLoggedProgress * PROGRESS_INTERVAL_PERC);
    logger.info(`syncCombatStats (${perc}% complete)`);
    lastLoggedProgress = progress;
  }
  job.setProgress(idx / length, undefined);
  return lastLoggedProgress;
}

async function fetchMails(
  kind: string,
  characterId: number,
  year: number,
  month: number
) {
  const mails = [] as ZkillIncident[];

  let pageIndex = 1;
  for (;;) {
    const page = await fetchMailsPage(
      kind,
      characterId,
      year,
      month,
      pageIndex
    );
    for (const incident of page) {
      mails.push(incident);
    }
    if (page.length >= ZKILL_MAX_RESULTS_PER_PAGE) {
      pageIndex++;
    } else {
      break;
    }
    // Add a delay here in order to prevent going over zKill's API limit.
    await Bluebird.delay(10000);
  }
  return mails;
}

function fetchMailsPage(
  kind: string,
  characterId: number,
  year: number,
  month: number,
  page: number
): Promise<ZkillIncident[]> {
  const url =
    `https://zkillboard.com/api/${kind}/characterID/${characterId}` +
    `/year/${year}/month/${month}/page/${page}/zkbOnly/`;
  return Promise.resolve(
    axios.get<ZkillIncident[] | ZkillErr>(url, {
      headers: {
        "User-Agent": process.env.USER_AGENT || "Sound Roster App",
        "Accept-Encoding": "gzip",
      },
    })
  ).then((response) => {
    if (!response.data || "error" in response.data) {
      const errorMessage = response.data?.error;
      throw new Error(
        `Unable to fetch ${kind} for ${characterId}: ${errorMessage}`
      );
    }
    return response.data;
  });
}

interface ZkillIncident {
  killID: number;
  zkb: {
    locationID: number;
    hash: string;
    totalValue: number;
    points: number;
    npc: boolean;
  };
}

interface ZkillErr {
  error: string;
}
