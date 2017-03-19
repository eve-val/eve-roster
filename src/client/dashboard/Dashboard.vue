<template>
<div class="root">
  <app-header :identity="identity" />
  <div class="centering-container">
  <div class="title">Dashboard</div>
    <loading-spinner
        v-if="dashboardPromise != null"
        class="main-spinner"
        :size="34"
        :promise="dashboardPromise"
        messageMode="text"
        />
    <div class="characters-container">
      <character-slab v-for="character in sortedCharacters"
          class="slab"
          :key="character.id"
          :accountId="accountId"
          :character="character"
          :loginParams="loginParams"
          :isMain="character.id == mainCharacter"
          :highlightMain="sortedCharacters.length > 1"
          :access="access"
          @requireRefresh="onRequireRefresh"
          />
      <div class="add-character" v-if="loginParams">
        <a class="add-character-link"
            :href="'https://login.eveonline.com/oauth/authorize?' + loginParams"
            >＋ Add a character</a>
        </div>
    </div>
  </div>
</div>
</template>

<script>
import ajaxer from '../shared/ajaxer';

import AppHeader from '../shared/AppHeader.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';

import CharacterSlab from './CharacterSlab.vue';


export default {
  components: {
    AppHeader,
    LoadingSpinner,
    CharacterSlab,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data: function() {
    return {
      accountId: null,
      characters: [],
      loginParams: null,
      mainCharacter: null,
      access: null,

      dashboardPromise: null,
    };
  },

  computed: {
    sortedCharacters: function() {
      this.characters.sort((a, b) => {
        if (a.id == this.mainCharacter) {
          return -1;
        } else if (b.id == this.mainCharacter) {
          return 1;
        } else {
          return a.name.localeCompare(b.name);
        }
      });
      return this.characters;
    }
  },

  created: function() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      this.characters = [];
      this.loginParams = null;
      this.mainCharacter = null;
      this.access = null;
      this.dashboardPromise = ajaxer.getDashboard()
        .then(response => {
          this.accountId = response.data.accountId;
          this.characters = response.data.characters;
          this.loginParams = response.data.loginParams;
          this.mainCharacter = response.data.mainCharacter;
          this.access = response.data.access;

          this.dashboardPromise = null;
        });
    },

    onRequireRefresh(characterId) {
      this.fetchData();
    },
  },
}
</script>

<style scoped>
.root {
  font-size: 14px;
  font-weight: 300;
}

.centering-container {
  max-width: 1056px;
  margin: 0 auto;
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 32px;
}

.main-spinner {
  margin-left: 32px;
}

.characters-container {
  margin: 0 32px 0 0;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.slab, .add-character {
  margin-left: 32px;
  margin-bottom: 32px;
  flex: 0 0 auto;
}

.add-character {
  width: 480px;
  height: 105px;
  border: 1px dashed #44403b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  color: #a7a29c;
  font-weight: 300;
  box-sizing: border-box;
}

.add-character-link {
  color: #676767;
  text-decoration: none;
}

.add-character-link:hover {
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
  color: #848484;
}

.add-character-link:active {
  color: #CDCDCD;
}
</style>
