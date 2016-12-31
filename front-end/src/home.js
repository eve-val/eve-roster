import Vue from 'vue';
import VueRouter from 'vue-router';

import Dashboard from './dashboard/Dashboard.vue';
import Housing from './housing/Housing.vue';
import Character from './character/Character.vue';
import Roster from './roster/Roster.vue';
import Roster2 from './roster/Roster.vue';

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', component: Dashboard, meta: { keepAlive: false } },
    { path: '/roster', component: Roster2, meta: { keepAlive: true } },
    { path: '/character/:id', component: Character, meta: { keepAlive: false } },
    { path: '/housing', component: Housing, meta: { keepAlive: false } },
  ],
});

Vue.use(VueRouter);

new Vue({
  el: '#app',
  router,
  data: {
    identity: $IDENTITY,
  },
});
