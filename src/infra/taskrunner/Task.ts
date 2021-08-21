import { Tnex } from "../../db/tnex/index";
import { JobLogger } from "./Job";

/**
 * A piece of background work that the server can perform.
 *
 * At its core, a Task is just a function that returns a Promise. Most Tasks
 * are scheduled to run periodically. Tasks can also be triggered manually via
 * the admin interface.
 *
 * Tasks are not meant to run forever: they should perform the work requested
 * and then resolve their Promise.
 *
 * Tasks should live in /task.
 *
 * To schedule your task to run periodically, add it to
 * /task-registry/scheduledTasks.ts.
 *
 * To allow admins to run the task from the web UI, add it to
 * /task-registry/runnableTasks.ts.
 */
export interface Task {
  /**
   * Unique ID for this task. Must not clash with any other task name. Used
   * in logs and to manage runnable tasks.
   */
  readonly name: string;
  /** Name displayed to users in the task admin UI. */
  readonly displayName: string;
  /** Short sentence describing what the task does. */
  readonly description: string;
  /** Actual function that does this work. Should return a Promise. */
  readonly executor: (db: Tnex, job: JobLogger) => Promise<void>;
  /**
   * How long the task should run for before the system assumes that it has
   * stalled. We can't "kill" such tasks, but the task runner will pretend that
   * it doesn't exist for the purposes of scheduling other tasks and performing
   * traffic control.
   */
  readonly timeout: number;
}
