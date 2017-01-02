const moment = require('moment');

const dao = require('../../dao');


module.exports = function truncateCronLog() {
  let cutoff = moment().subtract(90, 'days').valueOf();

  return dao.dropOldCronJobs(cutoff)
  .then(() => {
    return 'success';
  });
}



if (require.main == module) {
  module.exports()
  .catch(function(e) {
    console.log(e);
  });
}
