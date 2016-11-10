<template>
<div class="table">
  <div class="headers">
    <div v-for="header in headers"
        class="header"
        :class="{ active: header.key == sortKey }"
        @click="sortBy(header.key)"
        :style="header.style"
        >
      {{ header.label }}
      <span v-if="header.key == sortKey" class="sort-arrow">
        {{ reverseSort ? '▼' : '▲'}}
      </span>
    </div>
  </div>

  <member-entry v-for="row in sortedRows" :row="row" />
</div>
</template>

<script>
import MemberEntry from './MemberEntry.vue';

export default {
  props: {
    rows: {
      type: Array,
      required: true
    }
  },

  components: {
    MemberEntry
  },

  data: function() {
    return {
      sortKey: 'logonDateTime',
      reverseSort: true,
      headers: [
        {label: '', key: null,  style: {width: '64px'}},
        {label: 'Name', key: 'name', style: {width: '300px'}},
        {label: 'Last seen', key: 'logonDateTime', style: {width: '100px'}},
        {label: 'Siggy', key: 'siggyScore', style: {width: '60px'}},
        {label: 'Kills', key: 'recentKills', style: {width: '60px'}},
        {label: 'Losses', key: 'recentLosses', style: {width: '60px'}},
        {label: 'Citadel', key: 'homeCitadel', style: {width: '150px'}},
      ]
    }
  },

  computed: {
    sortedRows: function() {
      var self = this;
      this.rows.sort(function(a, b) {
        let aVal = a.aggregate[self.sortKey];
        let bVal = b.aggregate[self.sortKey];

        let comp = 0;
        if (aVal > bVal) {
          comp = 1;
        } else if (bVal > aVal) {
          comp = -1;
        }

        if (self.reverseSort) {
          comp = -comp;
        }

        return comp;
      });
      return this.rows;
    }
  },

  methods: {
    sortBy: function(key) {
      if (key == null) {
        return;
      }
      if (this.sortKey == key) {
        this.reverseSort = !this.reverseSort;
      } else{
        this.sortKey = key;
        this.reverseSort = key != 'name';
      }
    },
  }
}
</script>

<style scoped>
.headers {
  display: flex;
  font-size: 13px;
  color: #AAA;
  margin-bottom: 5px;
}

.header {
  padding: 0 5px;
  cursor: pointer;
  user-select: none;
}

.header:hover {
  color: #777;
}

.header:active {
  color: black;
}

.header.active {
  color: #333;
}

.sort-arrow {
  font-size: 10px;
}
</style>