<template>
  <div class="header">
    <eve-image :id="99000739" type="Alliance" :size="40" class="app-icon" />
    <router-link to="/" class="nav-link">Dashboard</router-link>
    <router-link to="/roster" class="nav-link">Roster</router-link>
    <router-link to="/housing" class="nav-link">Housing</router-link>
    <div class="spacer"></div>
    <div class="identity">{{ identity.name }}</div>
    <eve-image :id="identity.characterId" type="Character"
      :size="32" class="identity-icon" />
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
  }
}
</script>

<style scoped>
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 40px;
  /*background: #EEE;*/
  flex: none;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.08);
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
  font-size: 14px;
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

.identity {
  font-size: 12px;
  color: #777;
}

.identity-icon {
  margin: 0 5px;
}

</style>