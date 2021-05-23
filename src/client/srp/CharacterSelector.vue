<!--

Selectable dropdown for EVE characters.

Shows the portrait and name. Used by the SRP payment flow to select which
character is paying.

-->

<template>
  <div class="_character-selector">
    <select ref="select" v-model="selectedId" class="select">
      <option
        v-for="character in validCharacters"
        :key="character.id"
        class="select-option"
        :value="character.id"
      >
        {{ character.name }}
      </option>
    </select>
    <div class="cover">
      <template v-if="selectedCharacter != null">
        <eve-image
          :id="selectedCharacter.id"
          class="char-icon"
          :size="39"
          type="Character"
        />
        <div class="char-name">
          {{ selectedCharacter.name }}
        </div>
        <img class="select-triangle" src="../shared-res/select-dropdown.png" />
      </template>
    </div>
  </div>
</template>

<script>
import _ from "underscore";

import EveImage from "../shared/EveImage.vue";

import ajaxer from "../shared/ajaxer";

export default {
  components: {
    EveImage,
  },

  props: {
    accountId: { type: Number, required: true },
    modelValue: { type: Number, required: false, default: null },
  },

  emits: ["update:modelValue"],

  data() {
    return {
      characters: [],
      selectedId: this.modelValue,
    };
  },

  computed: {
    selectedCharacter() {
      return _.findWhere(this.characters, { id: this.selectedId });
    },
    validCharacters() {
      return this.characters.filter(this.isValidCharacter);
    },
  },

  watch: {
    selectedId(newValue) {
      if (newValue != this.modelValue) {
        this.$emit("update:modelValue", newValue);
      }
    },
  },

  mounted() {
    ajaxer.getAccountCharacters(this.accountId).then((response) => {
      this.characters = response.data;

      for (let character of this.characters) {
        if (this.isValidCharacter(character)) {
          this.selectedId = character.id;
          break;
        }
      }
    });
  },

  methods: {
    isValidCharacter(character) {
      return character.accessTokenValid && character.membership == "full";
    },
  },
};
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
  color: #cdcdcd;
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
  color: #cdcdcd;
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
