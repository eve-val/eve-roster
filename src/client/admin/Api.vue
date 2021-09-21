<template>
  <admin-wrapper title="ESI Proxy" :identity="identity">
    <swagger />
  </admin-wrapper>
</template>

<script lang="ts">
import AdminWrapper from "./AdminWrapper.vue";
import Swagger from "./Swagger.vue";
import { defineComponent } from "vue";

export default defineComponent({
  components: {
    AdminWrapper,
    Swagger,
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
