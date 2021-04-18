<!--

Wraps content in an optional link.

If the path is null, no link is generated.
If the path is to a server-local path, a <router-link> is used.
Otherwise an anchor tag is used.

-->

<template>
  <div v-if="path == undefined" class="_adaptive-link">
    <slot></slot>
  </div>
  <a
    v-else-if="isExternalUrl(path)"
    :class="[linkClass]"
    :href="path"
    target="_blank"
  >
    <slot></slot>
  </a>
  <router-link v-else :to="path" :class="[linkClass]">
    <slot></slot>
  </router-link>
</template>

<script>
import Vue from "vue";

const ABS_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export default Vue.extend({
  components: {},

  props: {
    linkClass: { type: String, required: false },
    path: { type: String, required: false },
  },

  methods: {
    isExternalUrl(path) {
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
