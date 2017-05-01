import Vue from 'vue';
import VueRouter from 'vue-router';

import Dashboard from './dashboard/Dashboard.vue';
import Character from './character/Character.vue';
import Roster from './roster/Roster.vue';

import AccountLog from './admin/AccountLog.vue';
import AdminSetup from './admin/Setup.vue';
import CronLog from './admin/CronLog.vue';
import CitadelManagement from './admin/CitadelManagement.vue';
import Dev from './dev/Dev.vue';

// Anything added here should also be in server.js:FRONTEND_ROUTES
// TODO(aiiane): make server.js just read it directly from here
const routes = [
  { path: '/', component: Dashboard, meta: { keepAlive: false } },
  { path: '/roster', component: Roster, meta: { keepAlive: true } },
  { path: '/character/:id', component: Character, meta: { keepAlive: false } },
  { path: '/admin', redirect: '/admin/account-logs', },
  { path: '/admin/setup', component: AdminSetup, },
  { path: '/admin/account-logs', component: AccountLog, },
  { path: '/admin/cron-logs', component: CronLog, },
  { path: '/admin/citadels', component: CitadelManagement, },
];
if (process.env.NODE_ENV == 'development') {
  routes.push(
      { path: '/dev/', component: Dev, },
      { path: '/dev/:section', component: Dev, });
}

const router = new VueRouter({
  mode: 'history',
  routes: routes,
});

Vue.use(VueRouter);

new Vue({
  el: '#app',
  router,
  data: {
    identity: $__IDENTITY,
  },
});
