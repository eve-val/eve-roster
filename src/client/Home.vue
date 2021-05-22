<template>
  <keep-alive>
    <router-view v-if="$route.meta.keepAlive" :identity="identity" />
  </keep-alive>
  <router-view v-if="!$route.meta.keepAlive" :identity="identity" />
</template>

<script>
export default {
  props: {
    identity: {
      type: Object,
      default: function () {
        return {};
      },
    },
  },
};
</script>
