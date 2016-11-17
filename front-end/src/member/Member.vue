<template>
  <div>
    <app-header :identity="identity" />
    <h1>Member! {{ $route.params.name }}</h1>
  </div>
</template>

<script>
import AppHeader from '../shared/AppHeader.vue';

export default {
  components: {
    AppHeader,
  },

  props: {
    identity: { type: Object, required: true }
  }
}
</script>

<style scoped>
</style>