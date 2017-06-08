const Promise = require('bluebird');

const cron = require('../../../cron/cron');
const protectedEndpoint = require('../../../route-helper/protectedEndpoint');
const BadRequestError = require('../../../error/BadRequestError');

module.exports = protectedEndpoint('json', (req, res, account, privs) => {
  return Promise.try(() => {
    privs.requireWrite('cronLogs');

    if (!req.params.task) {
      throw new BadRequestError('Missing task parameter');
    }
    if (!cron.isTask(req.params.task)) {
      throw new BadRequestError('Bad task name: ' + req.params.task);
    }

    if (cron.enqueue(req.params.task)) {
      return {};
    } else {
      return { warning: 'Task is already in queue.' };
    }
  });
});
