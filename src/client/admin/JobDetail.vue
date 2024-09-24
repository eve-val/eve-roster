<template>
  <AdminWrapper :title="pageTitle" :identity="identity">
    <LoadingSpinner
      v-if="data == null"
      :promise="fetchPromise"
      display="block"
      size="34px"
    />

    <template v-if="data != null">
      <table>
        <thead>
          <tr class="summary-row">
            <td class="row-label">task</td>
            <td class="row-value">{{ data.task }}</td>
          </tr>
        </thead>
        <tbody>
          <tr class="summary-row">
            <td class="row-label">id</td>
            <td class="row-value">{{ data.id }}</td>
          </tr>
          <tr class="summary-row">
            <td class="row-label">start</td>
            <td class="row-value">{{ displayDate(data.start) }}</td>
          </tr>
          <tr class="summary-row">
            <td class="row-label">end</td>
            <td class="row-value">{{ displayDate(data.end) }}</td>
          </tr>
          <tr class="summary-row">
            <td class="row-label">result</td>
            <td class="row-value">{{ data.result ?? "none" }}</td>
          </tr>
        </tbody>
      </table>

      <div class="logs-title">Logs</div>
      <div v-if="data.parsedLogs.length" class="logs">
        <div
          v-for="(log, i) in data.parsedLogs"
          :key="i"
          class="log-line"
          :style="logLineStyle(log)"
        >
          <span class="log-timestamp">{{ log.timestamp }}</span>
          <span class="log-level">&nbsp;{{ log.level }}</span>
          <span class="log-message">&nbsp;{{ log.message }}</span>
        </div>
      </div>
      <div v-else>No logs found for this job.</div>
    </template>
  </AdminWrapper>
</template>

<script lang="ts">
import { PropType, StyleValue, defineComponent } from "vue";
import AdminWrapper from "./AdminWrapper.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import moment from "moment";
import ajaxer from "../shared/ajaxer";
import { Identity } from "../home";
import { Admin_Tasks_Job_GET } from "../../shared/route/api/admin/tasks/job_GET";

export default defineComponent({
  components: {
    AdminWrapper,
    LoadingSpinner,
  },

  props: {
    identity: {
      type: Object as PropType<Identity>,
      required: true,
    },

    taskId: {
      type: Number,
      required: true,
    },
  },

  data() {
    return {
      data: null as Data | null,
      fetchPromise: null as Promise<unknown> | null,
    };
  },

  computed: {
    pageTitle() {
      if (this.data == null) {
        return `Job ${this.taskId}`;
      } else {
        return `${this.data.task} / ${this.taskId}`;
      }
    },
  },

  async mounted() {
    const promise = ajaxer.getAdminTaskJob(this.taskId);
    this.fetchPromise = promise;
    const response = await promise;
    this.fetchPromise = null;

    const parsedLogs: LogLine[] = [];
    for (const line of response.data.logs) {
      const match = LINE_PATTERN.exec(line);
      if (match) {
        parsedLogs.push({
          timestamp: match[1],
          pid: match[2],
          level: match[3],
          message: match[4],
        });
      } else {
        parsedLogs.push({ timestamp: "", pid: "", level: "", message: line });
      }
    }

    this.data = {
      parsedLogs,
      ...response.data,
    };
  },

  methods: {
    displayDate(value: number | null): string {
      if (value != null) {
        return moment(value).format("Y-MM-DD HH:mm:ss.SSS Z");
      }
      return "null";
    },

    logLineStyle(log: LogLine): StyleValue {
      const backgroundColor =
        log.level == "E" ? "#400c0c" : log.level == "W" ? "#362d0b" : undefined;

      if (backgroundColor) {
        return {
          backgroundColor,
        };
      } else {
        return {};
      }
    },
  },
});

// (timestamp) (pid) (logleve) (message)
const LINE_PATTERN = /^([^ ]+) +([^ ]+) +([^ ]+) (.*)/;

interface LogLine {
  timestamp: string;
  pid: string;
  level: string;
  message: string;
}

interface Data extends Admin_Tasks_Job_GET {
  parsedLogs: LogLine[];
}
</script>

<style scoped>
.summary-row {
  line-height: 2;
}

.row-label {
  color: #a7a29c;
  padding-right: 15px;
}

.row-value {
  font-family: monospace;
}

.logs-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 20px 0;
  font-weight: normal;
}

.logs {
  font-family: monospace;
  font-weight: normal;
  line-height: 1.6;
  background-color: #131313;
  padding: 10px 0px;
  font-size: 14px;
  white-space-collapse: break-spaces;
}

.log-line {
  padding: 0 10px;
}

.log-timestamp {
  color: #888;
}
</style>
