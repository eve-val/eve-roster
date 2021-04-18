<template>
  <div class="roster">
    <app-header :identity="identity" />
    <div class="centering-container">
      <div class="table-cnt">
        <div class="title-row">
          <div class="title">Roster</div>
          <loading-spinner class="loading-spinner" ref="spinner" size="33px" />
          <div class="title-spacer"></div>
          <search-box
            class="search-box"
            v-if="tableRows != null"
            @change="onSearchStringChange"
          />
        </div>
        <roster-table
          v-if="tableRows != null"
          :columns="displayColumns"
          :rows="tableRows"
          :filter="this.searchString"
          class="table"
        />
      </div>
      <div class="member-count" v-if="tableRows != null">
        {{ tableRows.length }} members
      </div>
    </div>
  </div>
</template>

<script>
import _ from "underscore";
import ajaxer from "../shared/ajaxer";

import rosterColumns from "./rosterColumns";

import AppHeader from "../shared/AppHeader.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import RosterTable from "./RosterTable.vue";
import SearchBox from "./SearchBox.vue";

export default {
  components: {
    AppHeader,
    LoadingSpinner,
    RosterTable,
    SearchBox,
  },

  props: {
    identity: { type: Object, required: true },
  },

  data: function () {
    return {
      displayColumns: null,
      tableRows: null,
      searchString: null,
    };
  },

  mounted: function () {
    this.$refs.spinner.observe(ajaxer.getRoster()).then((response) => {
      let providedColumns = response.data.columns;

      this.displayColumns = rosterColumns.filter((col) => {
        let sourceColumns = col.derivedFrom || [col.key];

        return _.reduce(
          sourceColumns,
          (accum, sourceCol) => accum && providedColumns.includes(sourceCol),
          true
        );
      });

      let rows = injectDerivedData(response.data.rows);
      this.tableRows = rows;
    });
  },

  methods: {
    onSearchStringChange: _.debounce(function (str) {
      if (str.length == 0) {
        this.searchString = null;
      } else if (str.length >= 3) {
        this.searchString = str;
      }
    }, 100),
  },
};

const APPEND_ATTRS = new Set(["alertMessage"]);

const SUM_ATTRS = new Set([
  "killsInLastMonth",
  "killValueInLastMonth",
  "lossesInLastMonth",
  "lossValueInLastMonth",
  "siggyScore",
  "activityScore",
]);

const MAX_ATTRS = new Set(["lastSeen", "alertLevel"]);

function injectDerivedData(data) {
  for (let account of data) {
    injectDerivedProps(account);
    account.aggregate = computeAggregateCharacter(account);
  }
  return data;
}

function computeAggregateCharacter(account) {
  let aggregate = {};

  // Calculate key set as union of keys in main and all alts
  let keys = Object.keys(account.main);
  for (let alt of account.alts) {
    keys.push(...Object.keys(alt));
  }

  for (let v of new Set(keys)) {
    if (APPEND_ATTRS.has(v)) {
      aggregate[v] = aggProp(v, account.main, ...account.alts);
    } else if (SUM_ATTRS.has(v)) {
      aggregate[v] = sumProp(v, account.main, ...account.alts);
    } else if (MAX_ATTRS.has(v)) {
      aggregate[v] = maxProp(v, account.main, ...account.alts);
    } else {
      aggregate[v] = account.main[v];
    }
  }
  return aggregate;
}

function aggProp(prop, ...chars) {
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

function sumProp(prop, ...chars) {
  let sawNotNull = false;
  let sum = 0;
  for (let char of chars) {
    if (char[prop] != null) {
      sum += char[prop];
      sawNotNull = true;
    }
  }
  return sawNotNull ? sum : null;
}

function maxProp(prop, ...chars) {
  let sawNotNull = false;
  let best = 0;
  for (let char of chars) {
    if (char[prop] != null) {
      best = Math.max(char[prop], best);
      sawNotNull = true;
    }
  }
  return sawNotNull ? best : null;
}

function injectDerivedProps(account) {
  for (let character of [account.main, ...account.alts]) {
    let lastSeen = getLastSeen(character);
    if (lastSeen != null) {
      character.lastSeen = lastSeen;
    }
    character.activityScore = getActivity(character);
  }
}

function getLastSeen(character) {
  if (character.logonDate == null || character.logoffDate == null) {
    return null;
  } else if (character.logonDate > character.logoffDate) {
    return Math.floor(Date.now() / 1000);
  } else {
    return character.logoffDate;
  }
}

function getActivity(character) {
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
