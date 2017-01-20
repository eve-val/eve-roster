<template>
<admin-wrapper title="Account log" :identity="identity">
  <div class="table" v-if="rows">
    <div class="headers">
      <div class="cell timestamp">Timestamp</div>
      <div class="cell account">Account</div>
      <div class="cell event">Event</div>
      <div class="cell related-char">Character involved</div>
      <div class="cell data">Data</div>
    </div>
    <div class="rows">
      <div class="row" v-for="row in rows" :key="row.id">
        <div class="cell timestamp">{{ row.timestamp | displayDate }}</div>
        <div class="cell account">
          {{ row.accountId }}
          <span class="main-character">/ {{ row.mainCharacter }}</span>
        </div>
        <div class="cell event">{{ row.event }}</div>
        <div class="cell related-char">{{ row.relatedCharacterName }}</div>
        <div class="data">
          <tooltip v-if="row.data" gravity="left" :packTarget="false">
            <div class="cell">
              { ... }
            </div>
            <pre slot="message"
                style="margin: 0"
                >{{ prettyPrint(row.data) }}</pre>
          </tooltip>
        </div>
      </div>
    </div>
    <div class="length-reminder">Showing most recent 200 records</div>
  </div>
  <loading-spinner
        v-if="dataPromise != null"
        :size="34"
        :promise="dataPromise"
        errorMode="text"
        />
</admin-wrapper>
</template>

<script>
import moment from 'moment';

import ajaxer from '../shared/ajaxer';

import AdminWrapper from './AdminWrapper.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';
import Tooltip from '../shared/Tooltip.vue';


export default {
  components: {
    AdminWrapper,
    LoadingSpinner,
    Tooltip,
  },

  props: {
    identity: { type: Object, required: true, },
  },

  data: function() {
    return {
      dataPromise: null,
      rows: null,
    };
  },

  created: function() {
    this.dataPromise = ajaxer.getAdminAccountLog()
    .then(response => {
      let rows = response.data.rows;
      this.rows = rows;
      this.dataPromise = null;
    });
  },

  filters: {
    displayDate: function(value) {
      return moment(value).format('Y/MM/DD HH:mm:ss Z');
    },
  },

  methods: {
    prettyPrint: function(jsonStr) {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    },
  }
}
</script>

<style scoped>
.table {
  margin-right: 100px;
  display: inline-block;
}

.headers, .row {
  font-size: 14px;
  padding: 10px 8px;
}

.headers {
  display: flex;
  color: #a7a29c;
  padding-bottom: 5px;
}

.row:nth-child(even) {
  background-color: #181818;
}

.row:nth-child(odd) {
  background-color: #131313;
}

.row {
  display: flex;
  font-weight: normal;
}

.cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timestamp {
  width: 230px;
}

.account {
  width: 220px;
}

.main-character {
  color: #666;
}

.event {
  width: 170px;
}

.related-char {
  width: 200px;
}

.data {
  cursor: default;
  width: 50px;
}

.length-reminder {
  margin-top: 20px;
  font-size: 14px;
  color: #a7a29c;
}
</style>
