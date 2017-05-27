<template>
<div class="table-header">
  <div v-for="column in columns"
      class="column-header"
      @mousedown="$emit('selectSortKey', column.key)"
      :style="{
        width: column.width + 'px',
        'text-align': column.numeric ? 'right' : 'left',
        'margin-left':
            column.margin != undefined ? column.margin + 'px' : undefined,
      }"
      >
    <img v-if="column.key == sortKey"
        class="sort-arrow"
        :class="arrowClasses"
        src="../assets/Roster-sort-order-arrow.png"
        >{{ column.label }}
  </div>
</div>
</template>

<script>

import _ from 'underscore';

export default {
  components: {
  },

  props: {
    columns: { type: Array, required: true },
    sortKey: { type: String, required: true },
    reverseSort: { type: Boolean, required: true },
  },

  data: function() {
    return {
    };
  },

  computed: {
    arrowClasses: function() {
      let classes = [];
      if (this.reverseSort) {
        classes.push('reverse');
      }
      let col = _.find(this.columns, col => col.key == this.sortKey);
      let numeric = col != null && col.numeric;
      if (numeric) {
        classes.push('right');
      } else {
        classes.push('left');
      }
      return classes;
    }
  }
}
</script>

<style scoped>
.table-header {
  display: flex;
  color: #6E6E6E;
  padding-bottom: 6px;
  padding-right: 30px;
  border-bottom: 1px solid #312C24;
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
