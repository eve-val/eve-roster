<template>
  <div class="_search-box">
    <input
      class="input"
      @input="onSearchBoxInput"
      @keyup.esc="onSearchBoxEsc"
    />
    <img class="icon" src="./res/search-roster.png" />
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: {},

  emits: ["change"],

  data: function () {
    return {};
  },

  methods: {
    onSearchBoxInput: function (ev) {
      this.$emit("change", ev.target.value.trim());
    },

    onSearchBoxEsc: function (ev) {
      ev.target.value = "";
      this.$emit("change", ev.target.value);
    },
  },
});
</script>

<style scoped>
._search-box {
  display: inline-block;
  position: relative;
}

.input {
  width: 200px;
  border: 1px solid #4c4842;
  border-radius: 1px;
  background: #181818;
  padding: 8px 8px 7px 32px;
  font-size: 14px;
  color: #cdcdcd;
}

.input:focus {
  outline: none;
  border-color: #655f57;
}

.icon {
  width: 22px;
  height: 23px;
  position: absolute;
  left: 5px;
  top: 5px;
  pointer-events: none;
}
</style>
