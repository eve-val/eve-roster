<template>
  <div id="swagger-ui" />
</template>

<script lang="ts">
import { defineComponent, inject } from "vue";
import SwaggerUI from "swagger-ui";

export default defineComponent({
  setup() {
    const csrf = inject("csrf");
    return { csrf };
  },

  data() {
    return {
      ui: null,
    } as {
      ui: null | SwaggerUI;
    };
  },

  watch: {
    $route(to, _from) {
      if (to.params.id) {
        this.ui?.preauthorizeApiKey("proxy", to.params.id);
      }
    },
  },

  mounted: function () {
    this.ui = SwaggerUI({
      url: "/esi/swagger.json",
      dom_id: "#swagger-ui",
      layout: "BaseLayout",
      tryItOutEnabled: true,
      syntaxHighlight: {
        activate: true,
        theme: "obsidian",
      },
      requestInterceptor: (req) => {
        req.headers._csrf = this.csrf;
        return req;
      },
      onComplete: () => {
        if (this.$route.params.id) {
          this.ui?.preauthorizeApiKey("proxy", this.$route.params.id);
        }
      },
    });
  },
});
</script>

<style scoped>
@import "../../../node_modules/swagger-ui/dist/swagger-ui.css";
@import "../css/esi.css";
</style>
