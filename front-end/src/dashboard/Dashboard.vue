<template>
<div class="root">
  <app-header
      :identity="identity"
      style="background: #101010;"
      />
  <div class="title">Dashboard</div>
  <div class="characters-container">
    <character-slab v-for="character in characters"
        class="slab"
        :character="character"
        @setApiKey="onApiKeySet"
        />
    <div class="add-character">＋ Add a character</div>
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
      characters: []
    };
  },

  created: function() {
    ajaxer.getDashboard()
      .then((response) => {
        this.characters = response.data.characters;
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
</style>