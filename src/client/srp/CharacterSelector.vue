<!--

Selectable dropdown for EVE characters.

Shows the portrait and name. Used by the SRP payment flow to select which
character is paying.

-->

<template>
<div class="_character-selector">
  <select
      class="select"
      v-model="selectedId"
      ref="select"
      >
    <option
        v-for="character in characters"
        v-if="isValidCharacter(character)"
        class="select-option"
        :key="character.id"
        :value="character.id"
        >
      {{ character.name }}
    </option>
  </select>
  <div class="cover">
    <template v-if="selectedCharacter != null">
      <eve-image
          class="char-icon"
          :id="selectedCharacter.id"
          :size="39"
          type="Character"
          >
      </eve-image>
      <div class="char-name">{{ selectedCharacter.name }}</div>
      <img class="select-triangle" src="../assets/Generic-select-dropdown.png">
    </template>
  </div>
</div>
</template>

<script>
import Vue from 'vue';
import _ from 'underscore';

import EveImage from '../shared/EveImage.vue';

import ajaxer from '../shared/ajaxer';


export default Vue.extend({
  components: {
    EveImage,
  },

  props: {
    accountId: { type: Number, required: true },
    value: { type: Number, required: false },
  },

  data() {
    return {
      characters: [],
      selectedId: this.value,
    }
  },

  computed: {
    selectedCharacter() {
      return _.findWhere(this.characters, { id: this.selectedId });
    },
  },

  mounted() {
    ajaxer.getAccountCharacters(this.accountId)
    .then(response => {
      this.characters = response.data;

      for (let character of this.characters) {
        if (this.isValidCharacter(character)) {
          this.selectedId = character.id;
          break;
        }
      }
    });
  },

  watch: {
    selectedId(newValue) {
      if (newValue != this.value) {
        this.$emit('input', newValue);
      }
    },
  },

  methods: {
    isValidCharacter(character) {
      return character.accessTokenValid && character.membership == 'full';
    },
  },
});
</script>

<style scoped>
._character-selector {
  position: relative;
  box-sizing: border-box;
  width: 253px;
  height: 49px;
}

.select {
  width: 100%;
  height: 100%;
  font-size: 14px;
  background: #111;
  -moz-appearance: none;
  outline: none;
}

.select-option {
  background: #161616;
  color: #CDCDCD;
  -moz-appearance: none;
  padding: 10px;
  font-size: 14px;
}

.cover {
  position: absolute;
  display: flex;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  background-color: #161616;
  border: 1px solid #282828;
  pointer-events: none;
  align-items: center;
}

.char-icon {
  margin-left: 4px;
}

.char-name {
  font-size: 14px;
  color: #CDCDCD;
  margin-left: 9px;
  flex: 1;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.select-triangle {
  width: 9px;
  height: 7px;
  margin-right: 9px;
  margin-left: 5px;
}

</style>
