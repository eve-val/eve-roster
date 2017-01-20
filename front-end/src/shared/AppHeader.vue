<template>
  <div class="header">
    <eve-image :id="99000739" type="Alliance" :size="40" class="app-icon" />
    <router-link to="/" class="nav-link" exact>Dashboard</router-link>
    <router-link 
        to="/roster"
        v-if="canReadRoster"
        class="nav-link"
        >Roster</router-link>
    <router-link
        to="/admin"
        v-if="canAccessAdminConsole"
        class="nav-link"
        >Admin</router-link>
    <div class="spacer"></div>
    <div class="logout">
      <a class="nav-link" href="/logout">Log out</a>
    </div>
  </div>
</template>

<script>
import EveImage from './EveImage.vue';

export default {
  components: {
    EveImage,
  },

  props: {
    identity: {
      type: Object,
      required: true
    }
  },

  computed: {
    canReadRoster() {
      return this.identity.access['roster'] >= 1;
    },

    canAccessAdminConsole() {
      return this.identity.access['adminConsole'] >= 1;
    },
  },
}
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
  color: #CDCDCD;
}

.router-link-active {
  color: #929292;
}

.spacer {
  flex-grow: 1;
}

</style>