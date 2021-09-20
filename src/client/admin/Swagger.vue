<template>
  <div id="swagger-ui" />
</template>

<script lang="ts">
import { defineComponent } from "vue";
import SwaggerUI from "swagger-ui";

export default defineComponent({
  mounted: function() {
    const ui = SwaggerUI({
      url: "https://esi.evetech.net/latest/swagger.json",
      dom_id: "#swagger-ui",
      layout: "BaseLayout",
    });
  },
});
</script>

<style scoped>
</style>
