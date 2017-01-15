<template>
<div class="roster">
  <app-header :identity="identity" />
  <div class="table-cnt">
    <div class="title-row">
      <div class="title">
        Roster
        <loading-spinner
            class="loading-spinner"
            v-if="rosterPromise != null"
            :size="33"
            :promise="rosterPromise"
            />
      </div>
      <search-box class="search-box"
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
</template>

<script>
import _ from 'underscore';
import ajaxer from '../shared/ajaxer';

import rosterColumns from './rosterColumns';

import AppHeader from '../shared/AppHeader.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';
import RosterTable from './RosterTable.vue'
import SearchBox from './SearchBox.vue';


export default {
  components: {
    AppHeader,
    LoadingSpinner,
    RosterTable,
    SearchBox,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data: function() {
    return {
      displayColumns: null,
      tableRows: null,
      searchString: null,

      rosterPromise: null,
    };
  },

  created: function() {
    this.rosterPromise = ajaxer.getRoster()
      .then(response => {
        let providedColumns = response.data.columns;
        this.displayColumns = rosterColumns.filter(item => {
          return item.key == 'warning' ||
              providedColumns.indexOf(item.key) != -1;
        });

        let rows = injectDerivedData(response.data.rows);
        this.tableRows = rows;

        this.rosterPromise = null;
      });
  },

  methods: {
    onSearchStringChange: _.debounce(function(str) {
      if (str.length == 0) {
        this.searchString = null;
      } else if (str.length >= 3) {
        this.searchString = str;
      }
    }, 100),
  }
}

const SUM_ATTRS = new Set([
  'killsInLastMonth',
  'killValueInLastMonth',
  'lossesInLastMonth',
  'lossValueInLastMonth',
  'siggyScore',
]);

const MAX_ATTRS = new Set([
  'lastSeen',
]);

function injectDerivedData(data) {
  for (let account of data) {
    injectLastSeen(account);
    let aggregate = {};
    for (let v in account.main) {
      if (SUM_ATTRS.has(v)) {
        aggregate[v] = sumProp(v, account.main, ...account.alts);
      } else if (MAX_ATTRS.has(v)) {
        aggregate[v] = maxProp(v, account.main, ...account.alts);
      } else {
        aggregate[v] = account.main[v];
      }
    }
    account.aggregate = aggregate;
  }
  return data;
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

function injectLastSeen(account) {
  for (let character of [account.main, ...account.alts]) {
    let lastSeen = getLastSeen(character);
    if (lastSeen != null) {
      character.lastSeen = lastSeen;
    }
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

</script>

<style scoped>
.roster {
  padding-bottom: 200px;
}

.loading-spinner {
  margin-left: 2px;
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
  flex: 1;
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
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
