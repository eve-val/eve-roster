<template>
<div class="root">
  <div class="tab-row">
    <div
        v-for="(tab, i) in tabs"
        class="tab"
        :class="{ selected: i == selectedIdx }"
        @mousedown="selectedIdx = i"
        >{{ tab.label }}</div>
  </div>
  <div class="content-container">
    <slot :selected="selectedTab"></slot>
  </div>
</div>
</template>

<script>
export default {
  props: {
    tabs: { type: Array, require: true },
  },

  data: function() {
    return {
      selectedIdx: 0,
    };
  },

  computed: {
    selectedTab: function() {
      return this.tabs[this.selectedIdx];
    }
  },
}
</script>

<style scoped>
.tab-row {
  display: flex;
  padding: 0 10px 0 10px;
  border-bottom: 2px solid #EEE;
}

.tab {
  padding: 4px 10px 2px 10px;
  cursor: default;
  color: #888;
  min-width: 100px;
  text-align: center;
}

.tab:hover {
  color: #444;
}

.tab.selected {
  color: black;
  background: #EEE;
}

</style>