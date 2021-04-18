import _ = require("underscore");

import { Task } from "../infra/taskrunner/Task";

import { syncCharacterLocations } from "../task/syncCharacterLocations";
import { syncCombatStats } from "../task/syncCombatStats";
import { syncKillmails } from "../task/syncKillmails";
import { syncRoster } from "../task/syncRoster";
import { syncBorrowedShips } from "../task/syncBorrowedShips";
import { syncNotifications } from "../task/syncNotifications";
import { syncSkills } from "../task/syncSkills";
import { syncCorps } from "../task/syncCorps";
import { truncateCronLog } from "../task/truncateCronLog";
import { truncateCharacterLocations } from "../task/truncateCharacterLocations";
import { updateSde } from "../task/updateSde";
import { triagePendingLosses } from "../task/triagePendingLosses";

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
