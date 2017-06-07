/**
 * System for scheduling tasks to be run. Tasks are run serially, i.e. only one
 * task can be run at a time. The rest wait in a queue until it's their turn.
 */
const _ = require('underscore');
const moment = require('moment');
const path = require('path');
const schedule = require('node-schedule');

const asyncUtil = require('../util/asyncUtil');
const dao = require('../dao');
const logger = require('../util/logger')(__filename);

// If executable module does not follow the pattern require('./task/<NAME>')
// where <NAME> is the key in the TASKS object, it may be set explicitly;
// otherwise it that pattern is assumed.
const TASKS = {
  'syncRoster': {
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
    interval: moment.duration(20, 'minutes').asMilliseconds(),
    schedule: '*/20 * * * *', // Every 20 minutes
  },
  'syncKillboard': {
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
    interval: moment.duration(1, 'day').asMilliseconds(),
    schedule: '0 2 * * *',  // Once a day at 2AM
  },
  'syncSiggy': {
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
    interval: moment.duration(1, 'day').asMilliseconds(),
    schedule: '0 2 * * *',  // Once a day at 2AM
  },
  'truncateCronLog': {
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
    interval: moment.duration(90, 'days').asMilliseconds(),
    schedule: '0 0 */90 * *',  // Every 90 days
  },
};

// Add name and executor properties to the task objects
for (let taskName of Object.keys(TASKS)) {
  TASKS[taskName].name = taskName;
  if (!TASKS[taskName].executor) {
    TASKS[taskName].executor = require(path.join(__dirname, './task/', taskName));
  }
}

const JOB_RESULTS = ['success', 'failure', 'partial', 'unknown'];

let initialized = false;
let activeJob = null;
let pendingTasks = [];
let isTaskQueueFrozen = true;

module.exports = {
  init() {
    if (initialized) {
      throw new Error('cron is already initialized');
    }
    isTaskQueueFrozen = true;

    let tasks = Object.keys(TASKS).map(name => TASKS[name]);
    asyncUtil.serialize(tasks, task => {
      return initTask(task);
    })
    .then(function() {
      initialized = true;

      isTaskQueueFrozen = false;
      maybeRunNextTask();
    });
  },

  enqueue(taskName) {
    if (taskName in TASKS) {
      return enqueueTask(TASKS[taskName]);
    } else {
      throw new Error('unknown task name: ' + taskName);
    }
  },

  isTask(taskName) {
    return taskName in TASKS;
  }
};

function initTask(task) {
  return enqueueTaskIfOverdue(task)
  .then(() => {
    schedule.scheduleJob(task.schedule, function() {
      enqueueTask(task);
    });
  })
  .catch(e => {
    logger.error('Error while initializing task "%s".', task.name);
    logger.error(e);
  });
}

function enqueueTaskIfOverdue(task) {
  return dao.cron.getMostRecentJob(task.name)
  .then(row => {
    let runTask = row == null
        || row.end == null
        || row.end + task.interval < Date.now();
    if (runTask) {
      enqueueTask(task);
    }
  });
}

function enqueueTask(task) {
  if (!isTaskQueuedOrRunning(task)) {
    pendingTasks.push(task);
    maybeRunNextTask();
    return true;
  } else {
    logger.warn(
        'Tried to enqueue task "%s" but it is already ' +
            'enqueued.',
        task.name);
    return false;
  }
}

function maybeRunNextTask() {
  if (activeJob == null && pendingTasks.length > 0 && !isTaskQueueFrozen) {
    runTask(pendingTasks.shift())
    .then(() => {
      maybeRunNextTask();
    });
  }
}

function runTask(task) {
  let job = {
    id: null,
    task: task,
  };
  activeJob = job;

  return dao.cron.startJob(task.name)
  .then(id => {
    job.id = id;

    logger.info('START task "%s" (job %s)', task.name, job.id);
    setTimeout(function() {
      if (activeJob == job) {
        logger.error('Task "%s" (job %s) TIMED OUT', task.name, job.id);
        activeJob = null;
        maybeRunNextTask();
      }
    }, task.timeout);
    return task.executor();
  })
  .then(result => {
    if (JOB_RESULTS.indexOf(result) == -1) {
      logger.warn('Task "%s" (job %s) returned a strange ' +
          'result: "%s".', task.name, job.id, result);
      result = 'unknown';
    }

    let logMethod = result == 'success'
        ? (...args) => logger.info(...args)
        : (...args) => logger.error(...args);

    logMethod(
        'FINISH task "%s" (job %s) with result "%s".',
        task.name,
        job.id,
        result);
    return dao.cron.finishJob(job.id, result);
  })
  .catch(e => {
    logger.error(
        'FAIL task "%s" (job %s)',
        task.name,
        job.id);
    logger.error(e);
    return dao.cron.finishJob(job.id, 'failure');
  })
  .then(() => {
    if (activeJob == job) {
      activeJob = null;
    }
  })
  .catch(e => {
    if (activeJob == job) {
      activeJob = null;
    }

    logger.error('FAILURE when trying to log cron job failure');
    logger.error(e);
  });
}

function isTaskQueuedOrRunning(task) {
  return (activeJob != null && activeJob.task.name == task.name) ||
      _.findWhere(pendingTasks, { name: task.name }) != null;
}
