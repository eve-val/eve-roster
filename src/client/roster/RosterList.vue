<template>
  <div class="roster">
    <app-header :identity="identity" />
    <div class="centering-container">
      <div class="table-cnt">
        <div class="title-row">
          <div class="title">Roster</div>
          <loading-spinner
            :promise="promise"
            class="loading-spinner"
            size="33px"
          />
          <div class="title-spacer" />
          <search-box
            v-if="tableRows != null"
            class="search-box"
            @change="onSearchStringChange"
          />
        </div>
        <roster-table
          v-if="tableRows != null"
          :columns="displayColumns"
          :rows="tableRows"
          :filter="searchString"
          class="table"
        />
      </div>
      <div v-if="tableRows != null" class="member-count">
        {{ tableRows.length }} members
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from "underscore";
import ajaxer from "../shared/ajaxer";

import rosterColumns, { Column } from "./rosterColumns";
import { Character, Account } from "./types";

import AppHeader from "../shared/AppHeader.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import RosterTable from "./RosterTable.vue";
import SearchBox from "./SearchBox.vue";

import { Identity } from "../home";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AppHeader,
    LoadingSpinner,
    RosterTable,
    SearchBox,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      displayColumns: null,
      tableRows: null,
      searchString: null,
      promise: null,
    } as {
      displayColumns: null | Column[];
      tableRows: null | Account[];
      searchString: null | string;
      promise: Promise<any> | null;
    };
  },

  mounted() {
    const promise = ajaxer.getRoster();
    this.promise = promise;
    promise.then((response) => {
      let providedColumns: string[] = response.data.columns;

      this.displayColumns = rosterColumns.filter((col: Column) => {
        let sourceColumns: string[] = col.derivedFrom ?? [col.key];

        return _.reduce(
          sourceColumns,
          (accum: boolean, sourceCol: string) =>
            accum && providedColumns.includes(sourceCol),
          true,
        );
      });

      let rows = injectDerivedData(response.data.rows);
      this.tableRows = rows;
    });
  },

  methods: {
    onSearchStringChange(str: string) {
      _.debounce(() => {
        if (str.length == 0) {
          this.searchString = null;
        } else if (str.length >= 3) {
          this.searchString = str;
        }
      }, 100)();
    },
  },
});

const APPEND_ATTRS = ["alertMessage"] as const;
type AppendAttr = (typeof APPEND_ATTRS)[number];
function isAppend(v: string): v is AppendAttr {
  return (APPEND_ATTRS as readonly string[]).includes(v);
}
const SUM_ATTRS = [
  "killsInLastMonth",
  "killValueInLastMonth",
  "lossesInLastMonth",
  "lossValueInLastMonth",
  "siggyScore",
  "activityScore",
] as const;
type SumAttr = (typeof SUM_ATTRS)[number];
function isSum(v: string): v is SumAttr {
  return (SUM_ATTRS as readonly string[]).includes(v);
}
const MAX_ATTRS = ["lastSeen", "alertLevel"] as const;
type MaxAttr = (typeof MAX_ATTRS)[number];
function isMax(v: string): v is MaxAttr {
  return (MAX_ATTRS as readonly string[]).includes(v);
}

function isCharacterKey(c: Character, key: string): key is keyof Character {
  return key in c;
}

function injectDerivedData(data: Account[]): Account[] {
  let ret: Account[] = [];
  for (let acc of data) {
    ret.push(injectDerivedProps(acc));
  }
  return ret;
}

function computeAggregateCharacter(account: Account): Character {
  let aggregate: Character = Object.assign({}, account.main);

  // Calculate key set as union of keys in main and all alts
  let keys = new Set<keyof Character>();
  for (let key of Object.keys(account.main)) {
    if (isCharacterKey(account.main, key)) {
      keys.add(key);
    }
  }
  for (let alt of account.alts) {
    for (let key of Object.keys(alt)) {
      if (isCharacterKey(alt, key)) {
        keys.add(key);
      }
    }
  }

  for (let v of keys) {
    if (isAppend(v)) {
      aggregate[v] = aggProp(v, account.main, ...account.alts);
    } else if (isSum(v)) {
      const sum = sumProp(v, account.main, ...account.alts);
      if (sum != null) {
        aggregate[v] = sum;
      }
    } else if (isMax(v)) {
      const max = maxProp(v, account.main, ...account.alts);
      if (max != null) {
        aggregate[v] = max;
      }
    } else if (isCharacterKey(account.main, v)) {
      aggregate = Object.assign(aggregate, {
        [v]: account.main[v],
      });
    }
  }
  return aggregate;
}

function aggProp(prop: AppendAttr, ...chars: Character[]): string {
  let text = "";
  for (let char of chars) {
    if (char[prop]) {
      if (text.length > 0) {
        text += " ";
      }
      text += char[prop];
    }
  }
  return text;
}

function sumProp(prop: SumAttr, ...chars: Character[]): null | number {
  let sawNotNull = false;
  let sum = 0;
  for (let char of chars) {
    const val = char[prop];
    if (val != null) {
      sum += val;
      sawNotNull = true;
    }
  }
  return sawNotNull ? sum : null;
}

function maxProp(prop: MaxAttr, ...chars: Character[]): number | null {
  let sawNotNull = false;
  let best = 0;
  for (let char of chars) {
    const val = char[prop];
    if (val != null) {
      best = Math.max(val, best);
      sawNotNull = true;
    }
  }
  return sawNotNull ? best : null;
}

function injectDerivedProps(account: Account): Account {
  let ret: Account = Object.assign({}, account, {
    aggregate: computeAggregateCharacter(account),
  });
  ret.main = Object.assign({}, account.main, {
    activityScore: getActivity(account.main),
  });
  ret.alts = [];
  for (let char of account.alts) {
    ret.alts.push(
      Object.assign({}, char, {
        activityScore: getActivity(char),
      }),
    );
  }
  return ret;
}

function getActivity(character: Character): null | number {
  if (character.siggyScore == null || character.killsInLastMonth == null) {
    return null;
  } else {
    return Math.round(character.siggyScore / 50 + character.killsInLastMonth);
  }
}
</script>

<style scoped>
.roster {
  padding-bottom: 200px;
}

.centering-container {
  width: 950px;
  margin: 0 auto;
}

.table-cnt {
  display: inline-block;
  margin: 0 33px 0 33px;
}

.title-row {
  display: flex;
  margin: 40px 0 40px 0;
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
}

.loading-spinner {
  margin-left: 20px;
  align-self: center;
}

.title-spacer {
  flex: 1;
}

.search-box {
  flex: 0 0 auto;
}

.table {
  min-width: 600px;
}

.member-count {
  margin-top: 20px;
  margin-left: 33px;
  font-size: 14px;
  font-weight: 300;
  color: #a7a29c;
}
</style>
