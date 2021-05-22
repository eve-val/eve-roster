<template>
  <keep-alive>
    <router-view
      v-if="$route.meta.keepAlive"
      :identity="identity"
    ></router-view>
  </keep-alive>
  <router-view v-if="!$route.meta.keepAlive" :identity="identity"></router-view>
</template>

<script>
export default {
  props: {
    identity: {
      default: {},
    },
  },
};
</script>
