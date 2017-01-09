/**
 * Manually run a cron task from the command line. Takes a single argument: the name of the task to run,
 * which are assumed located in back-end/src/cron/task
 */

const path = require('path');

if (process.argv.length != 3) {
  // Check if any remaining arguments are --revert or --rollback
  console.error('Must provide task name to run');
  process.exit(1);
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