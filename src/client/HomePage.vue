<template>
  <keep-alive>
    <router-view v-if="$route.meta.keepAlive" :identity="identity" />
  </keep-alive>
  <router-view v-if="!$route.meta.keepAlive" :identity="identity" />
</template>

<script lang="ts">
import { Identity } from "./home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  props: {
    identity: {
      type: Object as PropType<Identity>,
      default: function () {
        return {};
      },
    },
  },
});
</script>
