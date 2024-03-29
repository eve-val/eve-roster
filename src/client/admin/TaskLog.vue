<template>
  <div class="_task-log">
    <template v-if="rows">
      <div class="headers">
        <div class="cell task">Task</div>
        <div class="cell start">Start</div>
        <div class="cell duration">Duration</div>
        <div class="cell result">Result</div>
      </div>
      <div class="rows">
        <a
          v-for="row in rows"
          :key="row.id"
          class="row"
          :class="[
            row.result == 'failure' ? 'failure' : '',
            row.result != 'failure' && row.result != 'success'
              ? 'aberrant'
              : '',
          ]"
          :href="`/admin/tasks/job/${row.id}`"
        >
          <div class="cell task">
            {{ row.task }}
          </div>
          <div class="cell start">
            {{ displayDate(row.start) }}
          </div>
          <div class="cell duration">
            <span v-if="row.end != null">
              {{ displayDuration(row.end - row.start) }}
            </span>
          </div>
          <div class="cell result">
            {{ row.result }}
          </div>
        </a>
      </div>
      <div class="length-reminder">Showing most recent 400 records</div>
    </template>
  </div>
</template>

<script lang="ts">
import moment from "moment";

import { Log } from "./types";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  props: {
    rows: { type: Array as PropType<Log[]>, required: true },
  },

  methods: {
    displayDate: function (value: number): string {
      if (value != null) {
        return moment(value).format("Y/MM/DD HH:mm:ss Z");
      }
      return "";
    },

    displayDuration: function (value: number): string {
      return moment.duration(value).asSeconds().toFixed(1) + "s";
    },
  },
});
</script>

<style scoped>
.headers,
.row {
  font-size: 14px;
  padding: 10px 8px;
}

.headers {
  display: flex;
  color: #a7a29c;
  padding-bottom: 5px;
  padding-top: 0;
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

.row:hover .task {
  text-decoration: underline;
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

.task {
  width: 220px;
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
