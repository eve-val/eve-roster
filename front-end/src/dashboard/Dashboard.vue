<template>
<div class="root">
  <app-header :identity="identity" />
  <div class="title">Dashboard</div>
  <div class="characters-container">
    <character-slab v-for="character in sortedCharacters"
        class="slab"
        :character="character"
        :loginParams="loginParams"
        :isMain="character.id == mainCharacter"
        :highlightMain="sortedCharacters.length > 1"
        />
    <div class="add-character" v-if="loginParams">
      <a class="add-character-link"
          :href="'https://login.eveonline.com/oauth/authorize?' + loginParams"
          >＋ Add a character</a>
      </div>
  </div>
</div>
</template>

<script>
import ajaxer from '../shared/ajaxer';

import AppHeader from '../shared/AppHeader.vue';

import CharacterSlab from './CharacterSlab.vue';


export default {
  components: {
    AppHeader,
    CharacterSlab,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data: function() {
    return {
      characters: [],
      loginParams: null,
      mainCharacter: null,
    };
  },

  computed: {
    sortedCharacters: function() {
      this.characters.sort((a, b) => {
        if (a.id == this.mainCharacter) {
          return a;
        } else if (b.id == this.mainCharacter) {
          return b;
        } else {
          return a.name.localeCompare(b.name);
        }
      });
      return this.characters;
    }
  },

  created: function() {
    ajaxer.getDashboard()
      .then(response => {
        this.characters = response.data.characters;
        this.loginParams = response.data.loginParams;
        this.mainCharacter = response.data.mainCharacter;
      })
      .catch(e => {
        // TODO
        console.log('ERROR:', e);
      });
  },

  methods: {
  },
}
</script>

<style scoped>
.root {
  font-size: 14px;
  font-weight: 300;
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 33px;
}

.characters-container {
  margin: 0 33px 0 0;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.slab, .add-character {
  margin-left: 33px;
  margin-bottom: 33px;
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