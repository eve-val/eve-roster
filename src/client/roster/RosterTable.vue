<template>
  <div class="root">
    <table-header
      :columns="columns"
      :sort-key="sort.key"
      :reverse-sort="sort.reverse"
      @selectSortKey="onSelectSortKey"
    />
    <account-row
      v-for="row in sortedRows"
      :key="row.main.id"
      :columns="columns"
      :account="row"
      :filter="filter"
    />
  </div>
</template>

<script>
import AccountRow from "./AccountRow.vue";
import TableHeader from "./TableHeader.vue";

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

  data: function () {
    return {
      sort: {
        key: "name",
        reverse: false,
      },
    };
  },

  computed: {
    sortColumn: function () {
      for (let col of this.columns) {
        if (col.key == this.sort.key) {
          return col;
        }
      }
      return null;
    },

    sortedRows: function () {
      const copy = [...this.rows];
      // Sort accounts
      copy.sort((a, b) => {
        return generalPurposeCompare(
          getSortVal(this.sortColumn, a.aggregate, a),
          getSortVal(this.sortColumn, b.aggregate, b),
          this.sort.reverse
        );
      });

      // Sort alts
      for (let row of copy) {
        const alts = [...row.alts];
        alts.sort((a, b) => {
          return generalPurposeCompare(
            getSortVal(this.sortColumn, a, null),
            getSortVal(this.sortColumn, b, null),
            this.sort.reverse
          );
        });
        row.alts = alts;
      }

      return copy;
    },
  },

  methods: {
    onSelectSortKey: function (key) {
      if (key == this.sort.key) {
        this.sort.reverse = !this.sort.reverse;
      } else {
        this.sort.key = key;
        this.sort.reverse = false;
      }
    },
  },
};

function getSortVal(column, character, account) {
  if (column.account) {
    return account && account[column.key];
  } else {
    return character[column.key];
  }
}

function generalPurposeCompare(a, b, reverse) {
  let cmp;

  if (a == null && b != null) {
    cmp = -1;
  } else if (b == null && a != null) {
    cmp = 1;
  } else if (a == null && b == null) {
    cmp = 0;
  } else {
    if (typeof a == "string" && typeof b == "string") {
      cmp = a.localeCompare(b);
    } else {
      if (a > b) {
        cmp = 1;
      } else if (b > a) {
        cmp = -1;
      } else {
        cmp = 0;
      }
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
