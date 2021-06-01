<!--
  Generic container for pages in the app. Displays the root nav bar at the top
  and main content in a horizontally-centered container.
-->

<template>
  <div class="_app-page">
    <app-header :identity="identity" />
    <div
      class="centering-container"
      :style="{ width: contentWidth ? contentWidth + 'px' : '1000px' }"
    >
      <slot />
    </div>
  </div>
</template>

<script lang="ts">
import AppHeader from "./AppHeader.vue";

import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AppHeader,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
    contentWidth: { type: Number, required: false, default: 500 },
  },
});
</script>

<style scoped>
.centering-container {
  margin: 0 auto;
}
</style>
