<template>
  <div
    class="chip"
    @mousedown="onMouseDown"
    :style="{
      visibility: visible ? 'visible' : 'hidden',
      color: character.transactionInProgress ? 'green' : 'black',
    }"
  >
    <eve-image
      :id="character.characterId"
      type="Character"
      :size="24"
      class="portrait"
    /><span class="name">{{ character.name }}</span>
  </div>
</template>

<script>
import Vue from "vue";

import EveImage from "../shared/EveImage.vue";

export default {
  components: {
    EveImage,
  },

  props: {
    character: { type: Object, required: true },
    bus: { type: Vue, required: false },
  },

  data: function () {
    return {
      visible: true,
    };
  },

  methods: {
    setVisible: function (visible) {
      this.visible = visible;
    },

    onMouseDown: function (ev) {
      if (this.bus) {
        var bounds = this.$el.getBoundingClientRect();
        this.bus.$emit(
          "chipDrag",
          this,
          this.character.name,
          this.character.homeCitadel,
          bounds,
          ev.screenX,
          ev.screenY
        );
      }
    },
  },
};
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
