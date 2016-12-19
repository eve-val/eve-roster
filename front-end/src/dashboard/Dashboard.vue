<template>
<div class="root">
  <app-header
      :identity="identity"
      style="background: #101010;"
      />
  <div class="title">Dashboard</div>
  <div class="characters-container">
    <character-slab v-for="character in sortedCharacters"
        class="slab"
        :character="character"
        :loginParams="loginParams"
        :isMain="character.id == mainCharacter"
        :highlightMain="sortedCharacters.length > 1"
        @setApiKey="onApiKeySet"
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
      .then((response) => {
        this.characters = response.data.characters;
        this.loginParams = response.data.loginParams;
        this.mainCharacter = response.data.mainCharacter;
      })
      .catch((err) => {
        // TODO
        console.log('ERROR:', err);
      });
  },

  methods: {
    onApiKeySet: function(characterId, keyId, keyVerification) {
      ajaxer.putApiKey(characterId, keyId, keyVerification)
        .then((response) => {
          let updatedChars = response.data;
          for (let i = 0; i < updatedChars.length; i++) {
            this.updateOrAddCharacter(updatedChars[i]);
          }
        })
        .catch((err) => {
          // TODO
          console.log('ERROR', err);
        });
    },

    updateOrAddCharacter: function(chardata) {
      for (let i = 0; i < this.characters.length; i++) {
        if (this.characters[i].id == chardata.id) {
          this.characters.splice(i, 1, chardata);
          return;
        }
      }
      this.characters.push(chardata);
    }
  },
}
</script>

<style scoped>
.root {
  background: #202020;
  font-size: 14px;
  font-weight: 300;
  min-height: 2000px;
  color: #CDCDCD
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
  font-weight: 100;
}

.add-character-link {
  color: #676767;
  text-decoration: none;
}

.add-character-link:hover {
  text-decoration: underline;
}

.add-character-link:active {
  color: #CDCDCD;
}
</style>