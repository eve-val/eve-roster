<template>
  <div class="table-header">
    <div
      v-for="column in columns"
      :key="column.key"
      class="column-header"
      :style="{
        width: column.width + 'px',
        'text-align': column.numeric ? 'right' : 'left',
        'margin-left':
          column.margin != undefined ? column.margin + 'px' : undefined,
      }"
      @mousedown="$emit('select-sort-key', column.key)"
    >
      <img
        v-if="column.key == sortKey"
        class="sort-arrow"
        :class="arrowClasses"
        src="./res/sort-order-arrow.png"
      />{{ column.label }}
    </div>
  </div>
</template>

<script lang="ts">
import _ from "underscore";

import { Column } from "./rosterColumns";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  props: {
    columns: { type: Array as PropType<readonly Column[]>, required: true },
    sortKey: { type: String, required: true },
    reverseSort: { type: Boolean, required: true },
  },

  emits: ["select-sort-key"],

  computed: {
    arrowClasses: function (): string[] {
      let classes = [];
      if (this.reverseSort) {
        classes.push("reverse");
      }
      let col = _.find(this.columns, (col: Column) => col.key == this.sortKey);
      let numeric = col != null && col.numeric;
      if (numeric) {
        classes.push("right");
      } else {
        classes.push("left");
      }
      return classes;
    },
  },
});
</script>

<style scoped>
.table-header {
  display: flex;
  color: #6e6e6e;
  padding-bottom: 6px;
  padding-right: 30px;
  border-bottom: 1px solid #312c24;
  user-select: none;
  cursor: default;
}

.column-header {
  margin-left: 20px;
  position: relative;
}

.sort-arrow {
  width: 8px;
  height: 8px;
}

.sort-arrow.left {
  position: absolute;
  left: -11px;
  top: 5px;
}

.sort-arrow.right {
  position: relative;
  top: -1px;
  margin-right: 3px;
}

.sort-arrow.reverse {
  transform: rotate(180deg);
}
</style>
