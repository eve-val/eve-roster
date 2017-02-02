const _ = require('underscore');

const moment = require('moment');
const CONFIG = require('../config-loader').load();


const MODIFY_MAIN_WINDOW_DURATION =
    moment.duration(7, 'days').asMilliseconds();

module.exports = {
  canDesignateMain(accountCreated) {
    return Date.now() < accountCreated + MODIFY_MAIN_WINDOW_DURATION;
  },

  corpStatus(corpId) {
    if (_.findWhere(CONFIG.primaryCorporations, { id: corpId }) != null) {
      return 'primary';
    } else if (_.findWhere(CONFIG.altCorporations, { id: corpId }) != null) {
      return 'alt';
    } else {
      return 'external';
    }
  },

  isAffiliatedCorp(corpId) {
    return (_.findWhere(CONFIG.primaryCorporations, { id: corpId }) != null) ||
        (_.findWhere(CONFIG.altCorporations, { id: corpId }) != null);
  },

  TIMEZONE_LABELS: ['US West', 'US East', 'EU West', 'EU East', 'Aus', 'Other'],
};
