import moment from "moment";

import { dumpCharacterGroups } from "../task/dumpCharacterGroups.js";
import { syncCharacterLocations } from "../task/syncCharacterLocations.js";
import { syncCombatStats } from "../task/syncCombatStats.js";
import { syncKillmails } from "../task/syncKillmails.js";
import { syncRoster } from "../task/syncRoster.js";
import { syncSkills } from "../task/syncSkills.js";
import { syncCorps } from "../task/syncCorps.js";
import { truncateCronLog } from "../task/truncateCronLog.js";
import { truncateCharacterLocations } from "../task/truncateCharacterLocations.js";
import { triagePendingLosses } from "../task/triagePendingLosses.js";
import { TaskSchedule } from "../infra/taskrunner/cron.js";
import { syncBorrowedShips } from "../task/syncBorrowedShips.js";
import { syncNotifications } from "../task/syncNotifications.js";

/**
 * Schedules for periodically running certain tasks.
 */
export const SCHEDULED_TASKS: TaskSchedule[] = [
  {
    task: syncRoster,
    schedule: "*/15 * * * *", // Every 15 minutes...
    interval: moment.duration(61, "minutes").asMilliseconds(), // or at least every 61.
  },
  {
    task: syncCombatStats,
    schedule: "7 2 * * *", // Once a day at ~2AM
    interval: moment.duration(1, "day").asMilliseconds(),
  },
  {
    task: syncKillmails,
    schedule: "22 */2 * * *", // Every 2 hours
    interval: moment.duration(2, "hours").asMilliseconds(),
  },
  {
    task: syncSkills,
    schedule: "37 2 * * *", // Once a day at ~2AM
    interval: moment.duration(1, "day").asMilliseconds(),
  },
  {
    task: syncCorps,
    schedule: "52 2 * * *", // Once a day at ~2AM
    interval: moment.duration(1, "day").asMilliseconds(),
  },
  {
    task: syncCharacterLocations,
    schedule: "*/10 * * * * *", // Every 10 seconds - note the extra *
    interval: moment.duration(10, "seconds").asMilliseconds(),
    channel: "location",
    silent: true,
  },
  {
    task: truncateCharacterLocations,
    schedule: "0 0 */30 * *", // Every 30 days
    interval: moment.duration(30, "days").asMilliseconds(),
  },
  {
    task: truncateCronLog,
    schedule: "0 3 * * *", // Once a day at ~2AM
    interval: moment.duration(1, "day").asMilliseconds(),
  },
  {
    task: triagePendingLosses,
    schedule: "0 5 * * *", // Once a day at ~5AM
    interval: moment.duration(1, "day").asMilliseconds(),
  },
  {
    task: syncBorrowedShips,
    schedule: "7 */4 * * *", // Every 4 hours
    interval: moment.duration(4, "hours").asMilliseconds(),
  },
  {
    task: syncNotifications,
    schedule: "27 * * * * *", // 27th second of every minute
    interval: moment.duration(1, "minutes").asMilliseconds(),
    channel: "notification",
    silent: true,
  },
  {
    task: dumpCharacterGroups,
    schedule: "55 * * * * *", // 55th second of every minute
    interval: moment.duration(1, "minutes").asMilliseconds(),
    channel: "dump",
    silent: true,
  },
];
