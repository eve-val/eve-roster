<template>
  <admin-wrapper title="ESI Proxy" :identity="identity">
    <swagger-pane />
  </admin-wrapper>
</template>

<script lang="ts">
import AdminWrapper from "./AdminWrapper.vue";
import SwaggerPane from "./SwaggerPane.vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    AdminWrapper,
    SwaggerPane,
  },
});
</script>

<style scoped>
.section-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 50px 0 20px;
}
</style>
