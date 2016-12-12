// List of all routes served by us.
module.exports = {
  // These routes are handled by the web app -- we always serve the same HTML
  // and it figures out what to display.
  frontEnd: [
    '/',
    '/roster',
    '/member/:name',
    '/housing',
  ],
  // Content served directly by the Express server.
  backEnd: [
    '/login',
    '/authenticate',
    '/logout',
    '/api/*',
  ],
}