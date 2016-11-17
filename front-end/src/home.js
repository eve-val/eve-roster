import Vue from 'vue'
import VueRouter from 'vue-router'

import Housing from './housing/Housing.vue'
import Member from './member/Member.vue'
import Roster from './roster/Roster.vue'

const router = new VueRouter({
  mode: 'history',
  routes: [
    { path: '/', redirect: '/roster' },
    { path: '/roster', component: Roster, meta: { keepAlive: true } },
    { path: '/member/:name', component: Member, meta: { keepAlive: false } },
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
