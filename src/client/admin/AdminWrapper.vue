<template>
  <div class="_admin-wrapper">
    <app-header :identity="identity" />
    <div class="split-container">
      <div class="sidebar">
        <router-link class="sidebar-link" to="/admin/overview">
          Overview
        </router-link>
        <router-link class="sidebar-link" to="/admin/account-logs">
          Account log
        </router-link>
        <router-link class="sidebar-link" to="/admin/tasks">
          Tasks
        </router-link>
        <router-link class="sidebar-link" to="/admin/citadels">
          Citadels
        </router-link>
        <router-link class="sidebar-link" to="/admin/api">
          ESI Proxy
        </router-link>
        <router-link class="sidebar-link" to="/admin/setup">
          Setup
        </router-link>
      </div>
      <div class="main">
        <div class="title">
          {{ title }}
        </div>
        <slot />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import AppHeader from "../shared/AppHeader.vue";

import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AppHeader,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
    title: { type: String, required: true },
  },
});
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

.sidebar-link.router-link-active {
  color: #d7d7d7;
  text-shadow: 0 0 6px rgba(166, 116, 54, 58);
  text-decoration: none;
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
