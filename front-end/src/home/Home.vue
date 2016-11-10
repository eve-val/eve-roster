<template>
  <div id="app">
    <app-header :identity="identity" />
    <roster-table :rows="rows" style="margin: 40px 30px 0 30px;">
  </div>
</template>

<script>
let axios = require('axios');

import AppHeader from './AppHeader.vue';
import RosterTable from './RosterTable.vue';

export default {
  name: 'home',

  components: {
    AppHeader,
    RosterTable,
  },

  data () {
    return {
      rows: [],
      identity: {}
    }
  },

  mounted: function() {
    let self = this;
    axios.get('/fake-data/member_tracking_example.json')
      .then(function (response) {
        self.injectAggregates(response.data);
        self.rows = response.data;
      })
      .catch(function (err) {
        console.log('DATA FETCH ERROR:', err);
      });
  },

  methods: {
    injectAggregates: function(rows) {
      for (let i = 0; i < rows.length; i++) {
        var row = rows[i];
        var aggregate = {};
        for (let v in row) {
          switch (v) {
            case 'logonDateTime':
              aggregate[v] = aggregateMax(row, 'logonDateTime');
              break;
            case 'logoffDateTime':
              aggregate[v] = aggregateMax(row, 'logoffDateTime');
              break;
            case 'recentKills':
              aggregate[v] = aggregateSum(row, 'recentKills');
              break;
            case 'recentLosses':
              aggregate[v] = aggregateSum(row, 'recentLosses');
              break;
            case 'siggyScore':
              aggregate[v] = aggregateSum(row, 'siggyScore');
              break;
            default:
              aggregate[v] = row[v];
              break;
          }
          row.aggregate = aggregate;
        }
      }
    },

  },

}

function aggregateSum(row, prop) {
  let sum = row[prop];
  for (let i = 0; i < row.alts.length; i++) {
    sum += row.alts[i][prop];
  }
  return sum;
}

function aggregateMax(row, prop) {
  let best = row[prop];
  for (let i = 0; i < row.alts.length; i++) {
    best = Math.max(row.alts[i][prop], best);
  }
  return best;
}
</script>

<style>
body {
  margin: 0;
  padding: 0;

  font-family: Helvetica, 'Calibri', Arial, sans-serif;
  font-size: 16px;
}

#app {
}
</style>