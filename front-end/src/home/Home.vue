<template>
  <div id="app">
    <h1>SOUND Roster</h1>
    <div class="roster-table">
      <member-entry v-for="row in sortedRows" :row="row" />
    </div>
  </div>
</template>

<script>
let axios = require('axios');
import MemberEntry from './MemberEntry.vue';

export default {
  name: 'home',
  data () {
    return {
      rows: []
    }
  },

  mounted: function() {
    let self = this;
    axios.get('/fake-data/member_tracking_example.json')
      .then(function (response) {
        self.rows = response.data;
      })
      .catch(function (err) {
        console.log('DATA FETCH ERROR:', err);
      });
  },

  computed: {
    sortedRows: function() {
      this.rows.sort(function(a, b) {
        return b.logonDateTime - a.logonDateTime;
      });
      return this.rows;
    }
  },

  components: {
    MemberEntry,
  }
}
</script>

<style>
body {
  margin: 0;
  padding: 0;
  margin-top: 60px;
}

.roster-table {
  border-spacing: 0;
}

#app {
  margin-left: 20px;
}
</style>