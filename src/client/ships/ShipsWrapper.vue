<template>
  <div>
    <app-header :identity="identity"></app-header>
    <div class="split-container">
      <div class="sidebar">
        <router-link class="sidebar-link" to="/ships/borrowed-by-me">
          Borrowed by me
        </router-link>
        <router-link
          class="sidebar-link"
          to="/ships/borrowed-all"
          v-if="canSeeAllBorrowedShips"
        >
          All borrowed ships
        </router-link>
      </div>
      <div class="main">
        <div class="title">{{ title }}</div>
        <slot></slot>
      </div>
    </div>
  </div>
</template>

<script>
import AppHeader from "../shared/AppHeader.vue";

export default {
  components: {
    AppHeader,
  },

  props: {
    identity: { type: Object, required: true },
    title: { type: String, required: true },
  },

  computed: {
    canSeeAllBorrowedShips() {
      return this.identity.access["characterShips"] >= 1;
    },
  },
};
</script>

<style scoped>
.split-container {
  display: flex;
  font-weight: 300;
  width: 1200px;
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
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 0;
}
</style>
