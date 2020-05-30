import Vue from 'vue';
import VueRouter from 'vue-router';

import Dashboard from './dashboard/Dashboard.vue';
import Character from './character/Character.vue';
import Roster from './roster/Roster.vue';

import AdminOverview from './admin/AdminOverview.vue';
import AccountLog from './admin/AccountLog.vue';
import AdminSetup from './admin/Setup.vue';
import Tasks from './admin/Tasks.vue';
import CitadelManagement from './admin/CitadelManagement.vue';
import Dev from './dev/Dev.vue';

import Srp from './srp/Srp.vue';
import SrpDashboard from './srp/SrpDashboard.vue';
import CombatHistory from './srp/CombatHistory.vue';
import PaymentHistory from './srp/PaymentHistory.vue';
import PaymentTriage from './srp/PaymentTriage.vue';
import PaymentDetail from './srp/PaymentDetail.vue';
import BattleDetail from './srp/battles/BattleDetail.vue';


// Anything added here should also be in server.js:FRONTEND_ROUTES
// TODO(aiiane): make server.js just read it directly from here
const routes = [
  { path: '/', component: Dashboard, meta: { keepAlive: false } },
  { path: '/roster', component: Roster, meta: { keepAlive: true } },
  { path: '/character/:id', component: Character, meta: { keepAlive: false } },
  { path: '/admin', redirect: '/admin/account-logs', },
  { path: '/admin/overview', component: AdminOverview, },
  { path: '/admin/setup', component: AdminSetup, },
  { path: '/admin/account-logs', component: AccountLog, },
  { path: '/admin/tasks', component: Tasks, },
  { path: '/admin/citadels', component: CitadelManagement, },

  {
    path: '/srp',
    component: Srp,
    children: [
      {
        path: '',
        redirect: 'dashboard',
      },
      {
        path: 'dashboard',
        component: SrpDashboard,
      },
      {
        path: 'history',
        component: CombatHistory,
        props: { triageMode: false },
      },
      {
        path: 'history/:id',
        component: CombatHistory,
        props: (route) => ({
          forAccount: parseInt(route.params.id),
          triageMode: false,
        }),
      },
      {
        path: 'payments',
        component: PaymentHistory,
      },
      {
        path: 'triage',
        component: CombatHistory,
        props: { triageMode: true },
      },
      {
        path: 'triage/:id',
        component: CombatHistory,
        props: (route) => ({
          forAccount: parseInt(route.params.id),
          triageMode: true,
        }),
      },
      {
        path: 'pay',
        component: PaymentTriage,
      },
    ],
  },
  {
    path: '/srp/payment/:id',
    component: PaymentDetail,
    props: (route) => ({ srpId: parseInt(route.params.id) }),
  },
  {
    path: '/srp/battle/:id',
    component: BattleDetail,
    props: (route) => ({ battleId: parseInt(route.params.id) }),
  },
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
