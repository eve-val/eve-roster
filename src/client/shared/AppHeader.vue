<template>
  <div class="header">
    <eve-image :id="99000739" type="Alliance" :size="40" class="app-icon" />
    <router-link to="/" class="nav-link" exact> Dashboard </router-link>
    <router-link v-if="canReadRoster" to="/roster" class="nav-link">
      Roster
    </router-link>
    <router-link v-if="identity.isMember" to="/srp" class="nav-link">
      SRP
    </router-link>
    <router-link v-if="identity.isMember" to="/ships" class="nav-link">
      Ships
    </router-link>
    <router-link v-if="canAccessAdminConsole" to="/admin" class="nav-link">
      Admin
    </router-link>
    <router-link v-if="canAccessDev" to="/dev" class="nav-link">
      Dev
    </router-link>
    <div class="spacer" />
    <div class="logout">
      <a class="nav-link" href="/logout">Log out</a>
    </div>
  </div>
</template>

<script lang="ts">
import EveImage from "./EveImage.vue";

import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    EveImage,
  },

  props: {
    identity: {
      type: Object as PropType<Identity>,
      required: true,
    },
  },

  computed: {
    canReadRoster(): boolean {
      return this.identity.access.roster >= 1;
    },

    canAccessAdminConsole(): boolean {
      return this.identity.access.adminConsole >= 1;
    },

    canAccessDev(): boolean {
      return process.env.NODE_ENV == "development";
    },
  },
});
</script>

<style scoped>
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 40px;
  background: #101010;
  flex: none;

  font-size: 14px;
  font-weight: 300;
}

.app-icon {
  margin: 0 15px;
}

.title {
  padding-left: 15px;
  padding-right: 15px;
  font-size: 18px;
}

.nav-link {
  margin: 0 10px;
  color: #676767;
  text-decoration: none;
}

.nav-link:hover {
  text-decoration: underline;
}

.nav-link:active {
  color: #cdcdcd;
}

.router-link-active {
  color: #929292;
}

.spacer {
  flex-grow: 1;
}
</style>
