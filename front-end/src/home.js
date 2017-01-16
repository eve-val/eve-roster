import Vue from 'vue';
import VueRouter from 'vue-router';

import Dashboard from './dashboard/Dashboard.vue';
import Character from './character/Character.vue';
import Roster from './roster/Roster.vue';

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Dashboard, meta: { keepAlive: false } },
    { path: '/roster', component: Roster, meta: { keepAlive: true } },
    { path: '/character/:id', component: Character, meta: { keepAlive: false } },
  ],
});

Vue.use(VueRouter);

new Vue({
  el: '#app',
  router,
  data: {
    identity: $__IDENTITY,
  },
});
