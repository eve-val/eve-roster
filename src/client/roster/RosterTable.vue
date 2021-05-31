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

<script lang="ts">
import AccountRow from "./AccountRow.vue";
import TableHeader from "./TableHeader.vue";

import { Column } from "./rosterColumns";
import { Account, Character } from "./types";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AccountRow,
    TableHeader,
  },

  props: {
    columns: { type: Array as PropType<Column[]>, required: true },
    rows: { type: Array as PropType<Account[]>, required: true },
    filter: { type: String, required: false, default: "" },
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
    sortColumn: function (): Column {
      for (let col of this.columns) {
        if (col.key == this.sort.key && col.sortable) {
          return col;
        }
      }
      return this.columns[0];
    },

    sortedRows: function (): Account[] {
      const copy: Account[] = [...this.rows];
      // Sort accounts
      copy.sort((a: Account, b: Account) => {
        return generalPurposeCompare(
          getSortVal(this.sortColumn, a.aggregate, a),
          getSortVal(this.sortColumn, b.aggregate, b),
          this.sort.reverse
        );
      });

      // Sort alts
      for (let row of copy) {
        const alts = [...row.alts];
        alts.sort((a: Character, b: Character) => {
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
    onSelectSortKey: function (key: string) {
      if (key == this.sort.key) {
        this.sort.reverse = !this.sort.reverse;
      } else {
        this.sort.key = key;
        this.sort.reverse = false;
      }
    },
  },
});

function getSortVal(
  column: Column,
  character: Character | undefined,
  account: Account | null
): number | string | boolean | null | undefined {
  if (column.account) {
    if (account == null) {
      return null;
    }
    return account[column.key];
  } else if (character != undefined) {
    return character[column.key];
  }
  return undefined;
}

function generalPurposeCompare(a: any, b: any, reverse: boolean): number {
  let cmp = 0;

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
