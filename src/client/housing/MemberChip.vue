<template>
  <div
    class="chip"
    :style="{
      visibility: visible ? 'visible' : 'hidden',
      color: character.transactionInProgress ? 'green' : 'black',
    }"
    @mousedown="onMouseDown"
  >
    <eve-image
      :id="character.characterId"
      type="Character"
      :size="24"
      class="portrait"
    /><span class="name">{{ character.name }}</span>
  </div>
</template>

<script lang="ts">
import EveImage from "../shared/EveImage.vue";

import { defineComponent } from "vue";
export default defineComponent({
  components: {
    EveImage,
  },

  props: {
    character: { type: Object, required: true },
  },

  emits: ["chipDrag"],

  data() {
    return {
      visible: true,
    };
  },

  methods: {
    setVisible: function (visible) {
      this.visible = visible;
    },

    onMouseDown: function (ev) {
      var bounds = this.$el.getBoundingClientRect();
      this.$emit(
        "chipDrag",
        this,
        this.character.name,
        this.character.homeCitadel,
        bounds,
        ev.screenX,
        ev.screenY
      );
    },
  },
});
</script>

<style scoped>
.chip {
  display: inline-block;
  padding: 2px;
  border: 1px solid #ccc;
  background: #e9e9e9;
  cursor: default;
}

.portrait {
  vertical-align: middle;
}

.name {
  margin-left: 5px;
  vertical-align: middle;
  font-size: 12px;
}
</style>
