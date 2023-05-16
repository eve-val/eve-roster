import _ from "underscore";

import { Task } from "../infra/taskrunner/Task.js";

import { syncCharacterLocations } from "../task/syncCharacterLocations.js";
import { syncCombatStats } from "../task/syncCombatStats.js";
import { syncKillmails } from "../task/syncKillmails.js";
import { syncRoster } from "../task/syncRoster.js";
import { syncBorrowedShips } from "../task/syncBorrowedShips.js";
import { syncNotifications } from "../task/syncNotifications.js";
import { syncSkills } from "../task/syncSkills.js";
import { syncCorps } from "../task/syncCorps.js";
import { truncateCronLog } from "../task/truncateCronLog.js";
import { truncateCharacterLocations } from "../task/truncateCharacterLocations.js";
import { updateSde } from "../task/updateSde.js";
import { triagePendingLosses } from "../task/triagePendingLosses.js";

/**
 * List of tasks that can be manually invoked from the admin UI.
 */
const TASKS: Task[] = [
  syncRoster,
  syncCombatStats,
  syncCharacterLocations,
  syncKillmails,
  syncBorrowedShips,
  syncNotifications,
  syncSkills,
  syncCorps,
  triagePendingLosses,
  truncateCharacterLocations,
  truncateCronLog,
  updateSde,
];
verifyTaskNamesAreUnique(TASKS);

export function getRunnableTasks() {
  return TASKS;
}

export function findRunnableTaskWithName(name: string) {
  return _.findWhere(TASKS, { name });
}

function verifyTaskNamesAreUnique(tasks: Task[]) {
  const nameSet = new Set<string>();
  for (const task of tasks) {
    if (nameSet.has(task.name)) {
      throw new Error(`Duplicate task name "${task.name}".`);
    }
    nameSet.add(task.name);
  }
}
