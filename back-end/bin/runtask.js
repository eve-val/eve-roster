/**
 * Manually run a cron task from the command line. Takes a single argument: the
 * name of the task to run, which are assumed located in back-end/src/cron/task
 */

const path = require('path');

// Don't allow manual running on production since this does not update the cron
// DB at all.
const CONFIG = require('../src/config-loader').load();
if (CONFIG.serveMode == 'production') {
  console.error('Cannot execute cron task manually in production');
  process.exit(2);
}

if (process.argv.length != 3) {
  console.error('Must provide task name to run');
  process.exit(2);
}

const taskPath = path.join('../src/cron/task/', process.argv[2]);
const task = require(taskPath);
console.log('Running ', taskPath);

task()
.then(function(result) {
  console.log('Task completed: ', result);
})
.catch(function(error) {
  console.error('Task failed to complete:');
  console.log(error);
})
.then(function() {
  process.exit(0);
});