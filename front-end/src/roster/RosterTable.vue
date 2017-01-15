<template>
<div class="root">
  <table-header
      :columns="columns"
      :sortKey="sort.key"
      :reverseSort="sort.reverse"
      @selectSortKey="onSelectSortKey"
      />
  <account-row v-for="row in sortedRows"
      :columns="columns"
      :account="row"
      :key="row.main.id"
      :filter="filter"
      />
</div>
</template>

<script>
import AccountRow from './AccountRow.vue';
import TableHeader from './TableHeader.vue';


export default {
  components: {
    AccountRow,
    TableHeader,
  },

  props: {
    columns: { type: Array, required: true },
    rows: { type: Array, required: true },
    filter: { type: String, required: false },
  },

  data: function() {
    return {
      sort: {
        key: 'name',
        reverse: false,
      },
    };
  },

  computed: {
    sortColumn: function() {
      for (let col of this.columns) {
        if (col.key == this.sort.key) {
          return col;
        }
      }
      return null;
    },

    sortedRows: function() {
      // Sort accounts
      return this.rows.sort((a, b) => {
        return stringAwareCmp(
            getSortVal(this.sortColumn, a.aggregate, a.account),
            getSortVal(this.sortColumn, b.aggregate, b.account),
            this.sort.reverse
        );
      });

      // Sort alts
      for (let row of rows) {
        row.alts.sort((a, b) => {
          return stringAwareCmp(
              getSortVal(this.sortColumn, a, null),
              getSortVal(this.sortColumn, b, null),
              this.sort.reverse
          );
        });
      }
    },
  },

  methods: {
    onSelectSortKey: function(key) {
      if (key == this.sort.key) {
        this.sort.reverse = !this.sort.reverse;
      } else {
        this.sort.key = key;
        this.sort.reverse = false;
      }
    }
  }
}

function getSortVal(column, character, account) {
  if (column.account) {
    if (account != null) {
      return account[column.key];
    } else {
      return character.name;
    }
  } else {
    return character[column.key];
  }
}

function stringAwareCmp(a, b, reverse) {
  // TODO: deal with null values
  let cmp;
  if (typeof a == 'string' && typeof b == 'string') {
    cmp = a.localeCompare(b);
  } else {
    cmp = 0;
    if (a > b) {
      cmp = 1;
    } else if (b > a) {
      cmp = -1;
    }
  }

  if (reverse) {
    cmp = -cmp;
  }

  return cmp;
}

</script>

<style scoped>
.root {
  font-size: 14px;
  font-weight: 300;
  display: inline-block;
}
</style>
