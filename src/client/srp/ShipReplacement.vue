<!--

Root container for the SRP UI.

-->

<template>
  <app-page :identity="identity" :content-width="1100">
    <div class="title">SRP</div>

    <div class="nav">
      <router-link to="/srp/dashboard" class="nav-link">
        Dashboard
      </router-link>
      <router-link to="/srp/history" class="nav-link"> Activity </router-link>
      <router-link v-if="canWriteSrp" :to="exportPath" class="nav-link">
        Export
      </router-link>
      <router-link to="/srp/payments" class="nav-link"> Payments </router-link>
      <router-link v-if="canWriteSrp" to="/srp/triage" class="nav-link">
        Approve
      </router-link>
      <router-link v-if="canWriteSrp" to="/srp/pay" class="nav-link">
        Pay
      </router-link>
    </div>

    <router-view :identity="identity" />
  </app-page>
</template>

<script lang="ts">
import AppPage from "../shared/AppPage.vue";

import { Identity } from "../home";

import moment from "moment";
import { defineComponent, PropType } from "vue";

export default defineComponent({
  components: {
    AppPage,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  computed: {
    canWriteSrp(): boolean {
      return this.identity.access.srp == 2;
    },

    exportPath(): string {
      const oneMonthAgo = moment().subtract(1, "month").format("YYYY-MM-DD");
      return `/srp/export?startDate=${oneMonthAgo}`;
    },
  },
});
</script>

<style scoped>
.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 10px 0;
}

.nav {
  display: flex;
  margin-bottom: 40px;
  user-select: none;
}

.nav-link {
  margin-right: 26px;
  font-size: 18px;
  color: #686868;
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.router-link-active {
  color: #a7a29c;
}
</style>
