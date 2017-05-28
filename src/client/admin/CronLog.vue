<template>
<admin-wrapper title="Cron log" :identity="identity">
  <div class="task-runner">
    <select class="task-name" v-model="taskName">
      <option value="syncRoster">Sync Roster</option>
      <option value="syncKillboard">Sync Killboard</option>
      <option value="syncSiggy">Sync Siggy</option>
      <option value="truncateCronLog">Truncate Cron Log</option>
    </select>
    <button
        class="roster-btn submit-btn"
        :enabled="!submittingTask"
        @click="onSubmitClick"
        >Run Manually</button>
    <loading-spinner
        ref="submitSpinner"
        display="inline"
        defaultState="hidden"
        size="18px"
        />
  </div>

  <div class="table" v-if="rows">
    <div class="headers">
      <div class="cell task">Task</div>
      <div class="cell start">Start</div>
      <div class="cell duration">Duration</div>
      <div class="cell result">Result</div>
    </div>
    <div class="rows">
      <div class="row"
          v-for="row in rows"
          :key="row.id"
          :class="[
            row.result == 'failure' ? 'failure' : '',
            row.result != 'failure' && row.result != 'success'
                ? 'aberrant' : '',
          ]"
          >
        <div class="cell task">{{ row.task }}</div>
        <div class="cell start">{{ row.start | displayDate }}</div>
        <div class="cell duration">
          <span v-if="row.end != null">
            {{ (row.end - row.start) | displayDuration }}
          </span>
        </div>
        <div class="cell result">{{ row.result }}</div>
      </div>
    </div>
    <div class="length-reminder">Showing most recent 400 records</div>
  </div>
  <loading-spinner
      ref="spinner"
      display="block"
      size="34px"
      />
</admin-wrapper>
</template>

<script>
import Promise from 'bluebird';
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
      rows: null,
      taskName: 'syncRoster',
      submittingTask: false
    };
  },

  mounted: function() {
    this.refreshRows();
  },

  filters: {
    displayDate: function(value) {
      if (value != null) {
        return moment(value).format('Y/MM/DD HH:mm:ss Z');
      }
      return '';
    },

    displayDuration: function(value) {
      return moment.duration(value).asSeconds().toFixed(1) + 's';
    },
  },

  methods: {
    onSubmitClick() {
      if (this.submittingTask) {
        return;
      }
      this.submittingTask = true;
      this.$refs.submitSpinner.observe(
          // Use a bluebird promise so the finally() function exists
          Promise.resolve().then(() => ajaxer.putAdminCronTask(this.taskName)),
          response => {
            if (response.data.warning) {
              return { state: 'warning', message: response.data.warning };
            }
          })
      .finally(() => {
        this.submittingTask = false;
        this.refreshRows();
      });
    },

    refreshRows() {
      this.$refs.spinner.observe(ajaxer.getAdminCronLog())
      .then(response => {
        this.rows = response.data.rows;
      });
    }
  }
}
</script>

<style scoped>
.table {
  margin-right: 100px;
  display: inline-block;
  border-top: 1px solid #312C24;
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

.row.failure {
  background-color: #400c0c;
}

.row.aberrant {
  background-color: #483d13;
}

.length-reminder {
  margin-top: 20px;
  font-size: 14px;
  color: #a7a29c;
}

.submit-btn {
  font-size: 14px;
  margin-left: 5px;
  margin-right: 5px;
}

.task {
  width: 150px;
}

.task-name {
  background: transparent;
  border: 1px solid #514f4d;
  font-size: 14px;
  color: #a7a29c;
}

.task-runner {
  margin-bottom: 14px;
  position: relative;
}

.start {
  width: 220px;
}

.end {
  width: 250px;
}

.duration {
  width: 60px;
  text-align: right;
  margin-right: 30px;
}

.result {
  width: 100px;
}
</style>
