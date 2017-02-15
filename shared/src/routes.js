// List of all routes served by us.
module.exports = {
  // These routes are handled by the web app -- we always serve the same HTML
  // and it figures out what to display.
  frontEnd: [
    '/',
    '/roster',
    '/character/:id',
    '/housing',
    '/admin',
    '/admin/cron-logs',
    '/admin/account-logs',
  ],
  // Content served directly by the Express server.
  backEnd: [
    '/login',
    '/authenticate',
    '/logout',
    '/api/*',
    '/static/*',
    '/logs',
    '/logs/*'
  ],
};
