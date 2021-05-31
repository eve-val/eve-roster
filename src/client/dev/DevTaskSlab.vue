<template>
  <div class="_dev-task-slab">
    <task-slab class="tb" :task="taskShortName(null)" />
    <task-slab class="tb" :task="taskSimple(null)" />
    <task-slab class="tb" :task="taskExtraLongText(null)" />

    <task-slab class="tb" :task="taskExtraLongText(jobSimple())" />
    <task-slab class="tb" :task="taskExtraLongText(jobLabel())" />

    <task-slab class="tb" :task="taskShortName(jobNoProgress())" />
    <task-slab class="tb" :task="taskShortName(jobLowProgress())" />
    <task-slab class="tb" :task="taskShortName(jobHighProgress())" />

    <task-slab :promise="runPending" class="tb" :task="taskShortName(null)" />
    <task-slab :promise="runError" class="tb" :task="taskShortName(null)" />
    <task-slab :promise="runResolved" class="tb" :task="taskShortName(null)" />
  </div>
</template>

<script lang="ts">
import TaskSlab from "../admin/TaskSlab.vue";

import { Task, Job } from "../admin/types";

import { defineComponent } from "vue";
export default defineComponent({
  components: {
    TaskSlab,
  },

  data() {
    return {
      runPending: pendingPromise(),
      runError: errorPromise(),
      runResolved: resolvedPromise(),
    };
  },

  methods: {
    taskSimple(job: Job): Task {
      return {
        name: "scrib-cowling",
        displayName: "Scrub engine cowling",
        description: `Get to work! Those asteroids won't mine themselves!`,
        job: job,
      };
    },

    taskShortName(job: Job): Task {
      return {
        name: "scrib-cowling",
        displayName: "Fix droids",
        description: `That scavenged astromech has been looking at me funny.`,
        job: job,
      };
    },

    taskExtraLongText(job: Job): Task {
      return {
        name: "scrib-cowling",
        displayName: "Scrub filthy engine cowling",
        description:
          `Get to work! Those asteroids won't mine themselves!` +
          ` Can you even hear me, pipsqueak?!`,
        job: job,
      };
    },

    jobSimple(): Job {
      return {
        id: 1,
        task: "scrib-cowling",
        startTime: 1,
        progress: null,
        progressLabel: null,
      };
    },

    jobLabel(): Job {
      return {
        id: 1,
        task: "scrib-cowling",
        startTime: 1,
        progress: null,
        progressLabel: "Starting...",
      };
    },

    jobNoProgress(): Job {
      return {
        id: 1,
        task: "scrib-cowling",
        startTime: 1,
        progress: 0,
        progressLabel: null,
      };
    },

    jobLowProgress(): Job {
      return {
        id: 1,
        task: "scrib-cowling",
        startTime: 1,
        progress: 0.27,
        progressLabel: "Starting...",
      };
    },

    jobHighProgress(): Job {
      return {
        id: 1,
        task: "scrib-cowling",
        startTime: 1,
        progress: 0.97,
        progressLabel: "Starting...",
      };
    },
  },
});

function pendingPromise(): Promise<void> {
  return new Promise(() => {});
}

function errorPromise(): Promise<void> {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error("A terrible error has occurred."));
    }, 1000);
  });
}

function resolvedPromise(): Promise<void> {
  return Promise.resolve();
}
</script>

<style scoped>
.title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 5px 0;
  font-weight: 300;
}

.tb {
  margin-top: 30px;
  width: 676px;
}
</style>
