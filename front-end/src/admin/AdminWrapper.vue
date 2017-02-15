<template>
<div class="_admin-wrapper">
  <app-header :identity="identity" />
  <div class="split-container">
    <div class="sidebar">
      <router-link
          class="sidebar-link"
          to="/admin/account-logs"
      >
        Account log
      </router-link>
      <router-link
          class="sidebar-link"
          to="/admin/cron-logs"
      >
        Cron log
      </router-link>
      <a href="/logs" class="sidebar-link">
        Server log
      </a>
    </div>
    <div class="main">
      <div class="title">{{ title }}</div>
      <slot></slot>
    </div>
  </div>
</div>
</template>

<script>
import AppHeader from '../shared/AppHeader.vue';

export default {
  components: {
    AppHeader,
  },

  props: {
    identity: { type: Object, required: true, },
    title: { type: String, required: true, },
  },
}
</script>

<style scoped>
.split-container {
  display: flex;
  font-weight: 300;
  width: 1200px;
  margin: 0 auto;
}

.sidebar {
  width: 230px;
  flex: 0 0 auto;
  padding-left: 33px;
  padding-top: 40px;
}

.sidebar-link {
  display: block;
  font-size: 14px;
  color: #a7a29c;
  margin-bottom: 14px;
  text-decoration: none;
}

.sidebar-link:hover {
  text-decoration: underline;
}

.main {
  flex: 1;
  padding-bottom: 200px;
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 0;
}
</style>
