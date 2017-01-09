const moment = require('moment');

const MODIFY_MAIN_WINDOW_DURATION =
    moment.duration(7, 'days').asMilliseconds();

module.exports = {
  canDesignateMain(accountCreated) {
    return Date.now() < accountCreated + MODIFY_MAIN_WINDOW_DURATION;
  },
};
