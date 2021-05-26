<template>
  <admin-wrapper title="Server tasks" :identity="identity">
    <div class="root-container">
      <div class="description">
        Pieces of work that the server needs to periodically perform. Most of
        them can be run manually if desired.
      </div>

      <loading-spinner
        ref="root_spinner"
        class="root-spinner"
        display="block"
        size="34px"
      />

      <template v-if="tasks != null">
        <div class="header">Tasks</div>
        <transition-group name="task-block" tag="div">
          <task-slab
            v-for="task in tasksWithJobs"
            :key="task.name"
            class="task-block"
            :task="task"
            @jobStarted="onJobStarted"
          />
          <div
            v-if="areAnyActiveJobs"
            key="__divider"
            class="active-task-divider"
          />
          <task-slab
            v-for="task in tasksWithoutJobs"
            :key="task.name"
            class="task-block"
            :task="task"
            @jobStarted="onJobStarted"
          />
        </transition-group>

        <div class="header">Task log</div>
        <task-log :rows="taskLog" />
      </template>
    </div>
  </admin-wrapper>
</template>

<script lang="ts">
import Promise from "bluebird";
import _ from "underscore";

import ajaxer from "../shared/ajaxer";

import AdminWrapper from "./AdminWrapper.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import TaskSlab from "./TaskSlab.vue";
import TaskLog from "./TaskLog.vue";

import { Task, Job } from "./types";

const POLL_FREQUENCY = 4000;

import { Identity } from "../home";
import { AxiosResponse } from "axios";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AdminWrapper,
    LoadingSpinner,
    TaskSlab,
    TaskLog,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data: function () {
    return {
      tasks: <Task[]>[],
      taskLog: [],
      polling: false,
    };
  },

  computed: {
    tasksWithJobs(): Task[] {
      return this.tasks.filter((t: Task) => t.job != null);
    },
    tasksWithoutJobs(): Task[] {
      return this.tasks.filter((t: Task) => t.job == null);
    },
    areAnyActiveJobs() {
      for (let i = 0; i < this.tasks.length; i++) {
        if (this.tasks[i].job != null) {
          return true;
        }
      }
      return false;
    },
  },

  mounted: function () {
    this.$refs.root_spinner
      .observe(
        Promise.all([
          ajaxer.getAdminTasks(),
          ajaxer.getAdminJobs(),
          ajaxer.getAdminTaskLog(),
        ])
      )
      .then(([tasks, jobs, logs]) => {
        this.initializeTasks(tasks.data, jobs.data);
        this.taskLog = logs.data;
      });
  },

  methods: {
    initializeTasks(tasks: Task[], jobs: Job[]) {
      for (let task of tasks) {
        task.job = null;
        task.isSynthetic = false;
      }
      this.tasks = tasks;

      this.applyJobs(jobs);
      if (this.areAnyActiveJobs) {
        this.startPollingJobs();
      }
    },

    onJobStarted(taskName: string) {
      let task = _.findWhere(this.tasks, { name: taskName });
      if (task == null) {
        console.error("Unknown task:", taskName);
        return;
      }

      // Create a fake job for now
      if (task.job == null) {
        task.job = {
          id: -1,
          task: taskName,
          startTime: Date.now(),
          progress: null,
          progressLabel: "Starting...",
        };
      }

      this.startPollingJobs();
    },

    startPollingJobs() {
      if (this.polling) {
        return;
      }
      this.polling = true;
      let poll = () => {
        ajaxer.getAdminJobs().then((response: AxiosResponse) => {
          this.applyJobs(response.data);
          if (this.areAnyActiveJobs) {
            setTimeout(poll, POLL_FREQUENCY);
          } else {
            this.polling = false;
          }
        });
      };
      poll();
    },

    applyJobs(jobs: Job[]) {
      // Merge jobs into this.tasks
      let jobEnded = false;
      for (let i = 0; i < this.tasks.length; i++) {
        let task = this.tasks[i];
        let job = _.findWhere(jobs, { task: task.name });
        if (task.isSynthetic && job == null) {
          // snip the task
          this.tasks.splice(i, 1);
          i--;
          jobEnded = true;
        } else {
          if (job == null && task.job != null) {
            jobEnded = true;
          }
          task.job = job;
        }
        if (job != null) {
          job.processed = true;
        }
      }

      // Create tasks for any anonymous jobs
      for (let job of jobs) {
        if (!job.processed) {
          this.tasks.push({
            name: job.task,
            displayName: job.task,
            description: "",
            isSynthetic: true,
            job: job,
          });
        }
      }

      this.sortTasks();

      if (jobEnded) {
        this.fetchUpdatedTaskLog();
      }
    },

    sortTasks() {
      this.tasks.sort((a: Task, b: Task) => {
        let cmp = compareJobs(a, b);
        if (cmp == 0) {
          cmp = compareStartTimes(a, b);
        }
        if (cmp == 0) {
          cmp = a.name.localeCompare(b.name);
        }
        return cmp;
      });
    },

    fetchUpdatedTaskLog() {
      ajaxer.getAdminTaskLog().then((response: AxiosResponse) => {
        this.taskLog = response.data;
      });
    },
  },
});

function compareJobs(a: Task, b: Task): number {
  if (a.job != null && b.job == null) {
    return -1;
  } else if (b.job != null && a.job == null) {
    return 1;
  } else {
    return 0;
  }
}

function compareStartTimes(a: Task, b: Task): number {
  const startA = a.job?.startTime;
  const startB = b.job?.startTime;

  if (startA == null && startB == null) {
    return 0;
  } else if (startB == null) {
    return -1;
  } else if (startA == null) {
    return 1;
  } else if (startA < startB) {
    return -1;
  } else if (startB < startA) {
    return 1;
  }
  return 0;
}
</script>

<style scoped>
.root-container {
  width: 676px;
}

.root-spinner {
  margin-top: 20px;
}

.description {
  font-size: 14px;
  font-weight: normal;
}

.header {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 20px 0;
  font-weight: normal;
}

.task-block {
  margin-top: 14px;
}

.active-task-divider {
  height: 1px;
  background: #2a2a2a;
  margin: 15px 18px;
}

.task-block,
.active-task-divider {
  transition-duration: 700ms;
  transition-timing-function: cubic-bezier(0.86, 0, 0.07, 1);
  transition-property: transform, opacity;
}

.task-block-leave-active {
  position: absolute;
}

.task-block-enter,
.task-block-leave-to {
  opacity: 0;
}
</style>
