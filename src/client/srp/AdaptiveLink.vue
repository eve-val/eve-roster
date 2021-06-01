<!--

Wraps content in an optional link.

If the path is null, no link is generated.
If the path is to a server-local path, a <router-link> is used.
Otherwise an anchor tag is used.

-->

<template>
  <div v-if="path == undefined" class="_adaptive-link">
    <slot />
  </div>
  <a
    v-else-if="isExternalUrl(path)"
    :class="[linkClass]"
    :href="path"
    target="_blank"
  >
    <slot />
  </a>
  <router-link v-else :to="path" :class="[linkClass]">
    <slot />
  </router-link>
</template>

<script lang="ts">
const ABS_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

import { defineComponent } from "vue";
export default defineComponent({
  props: {
    linkClass: { type: String, required: false, default: "" },
    path: { type: String, required: false, default: "" },
  },

  methods: {
    isExternalUrl(path: string) {
      return ABS_URL_PATTERN.test(path);
    },
  },
});
</script>

<style scoped>
._adaptive-link {
  display: inline;
}
</style>
