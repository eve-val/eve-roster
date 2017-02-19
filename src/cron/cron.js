/**
 * System for scheduling tasks to be run. Tasks are run serially, i.e. only one
 * task can be run at a time. The rest wait in a queue until it's their turn.
 */
const _ = require('underscore');
const moment = require('moment');
const schedule = require('node-schedule');

const asyncUtil = require('../util/asyncUtil');
const dao = require('../dao');
const logger = require('../util/logger')(__filename);


const TASKS = [
  {
    name: 'syncRoster',
    executor: require('./task/syncRoster'),
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
    interval: moment.duration(20, 'minutes').asMilliseconds(),
    schedule: '*/20 * * * *', // Every 20 minutes
  },
  {
    name: 'syncKillboard',
    executor: require('./task/syncKillboard'),
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
    interval: moment.duration(1, 'day').asMilliseconds(),
    schedule: '0 2 * * *',  // Once a day at 2AM
  },
  {
    name: 'syncSiggy',
    executor: require('./task/syncSiggy'),
    timeout: moment.duration(30, 'minutes').asMilliseconds(),
    interval: moment.duration(1, 'day').asMilliseconds(),
    schedule: '0 2 * * *',  // Once a day at 2AM
  },
  {
    name: 'truncateCronLog',
    executor: require('./task/truncateCronLog'),
    timeout: moment.duration(5, 'minutes').asMilliseconds(),
    interval: moment.duration(90, 'days').asMilliseconds(),
    schedule: '0 0 */90 * *',  // Every 90 days
  },
];

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

    asyncUtil.serialize(TASKS, task => {
      return initTask(task);
    })
    .then(function() {
      initialized = true;

      isTaskQueueFrozen = false;
      maybeRunNextTask();
    });
  }
};

function initTask(task) {
  logger.info('Register task "%s"', task.name);
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
  return dao.getMostRecentCronJob(task.name)
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
  } else {
    logger.warn(
        'Tried to enqueue task "%s" but it is already ' +
            'enqueued.',
        task.name);
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

  return dao.startCronJob(task.name)
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
    return dao.finishCronJob(job.id, result);
  })
  .catch(e => {
    logger.error(
        'FAIL task "%s" (job %s)',
        task.name,
        job.id);
    logger.error(e);
    return dao.finishCronJob(job.id, 'failure');
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

function isTaskQueuedOrRunning(name) {
  return (activeJob != null && activeJob.task.name == name) ||
      _.findWhere(pendingTasks, { name: name }) != null;
}
