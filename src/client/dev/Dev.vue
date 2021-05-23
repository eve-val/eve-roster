<template>
  <div class="_dev-frame">
    <app-header :identity="identity" />
    <div class="split-container">
      <div class="sidebar">
        <router-link
          v-for="section in sections"
          :key="section.path"
          class="sidebar-link"
          :to="'/dev/' + section.path"
        >
          {{ section.label }}
        </router-link>
      </div>
      <div class="main">
        <template v-if="currentSection">
          <div class="title">
            {{ currentSection.label }}
          </div>
          <component :is="currentSection.component" />
        </template>
        <template v-else>
          <div class="title">Component state development</div>
          Use these sections to develop the look of your components across all
          of their possible states.
        </template>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from "underscore";

import AppHeader from "../shared/AppHeader.vue";

import DevLoadingSpinner from "./DevLoadingSpinner.vue";
import DevOwnedCharacterSlab from "./DevOwnedCharacterSlab.vue";
import DevTaskSlab from "./DevTaskSlab.vue";

import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AppHeader,
    DevLoadingSpinner,
    DevTaskSlab,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      sections: [
        {
          component: DevLoadingSpinner,
          label: "LoadingSpinner",
          path: "loading-spinner",
        },
        {
          component: DevOwnedCharacterSlab,
          label: "OwnedCharacterSlab",
          path: "owned-character-slab",
        },
        {
          component: DevTaskSlab,
          label: "TaskSlab",
          path: "dev-task-slab",
        },
      ],
    };
  },

  computed: {
    currentSection() {
      return _.findWhere(this.sections, { path: this.$route.params.section });
    },
  },
});
</script>

<style scoped>
.split-container {
  display: flex;
  font-weight: 300;
  margin: 0 auto;
}

.sidebar {
  width: 230px;
  flex: 0 0 auto;
  padding-left: 33px;
  padding-top: 40px;
}

.sidebar-link {
  display: block;
  font-size: 14px;
  color: #a7a29c;
  margin-bottom: 14px;
  text-decoration: none;
}

.sidebar-link:hover {
  text-decoration: underline;
}

.sidebar-link.router-link-active {
  color: #d7d7d7;
  text-shadow: 0 0 6px rgba(166, 116, 54, 58);
  text-decoration: none;
}

.main {
  flex: 1;
  padding-bottom: 200px;
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 0;
}
</style>
