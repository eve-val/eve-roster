<template>
<div class="_dev-task-slab">

  <task-slab class="tb" :task="taskShortName(null)"></task-slab>
  <task-slab class="tb" :task="taskSimple(null)"></task-slab>
  <task-slab class="tb" :task="taskExtraLongText(null)"></task-slab>

  <task-slab class="tb" :task="taskExtraLongText(jobSimple())"></task-slab>
  <task-slab class="tb" :task="taskExtraLongText(jobLabel())"></task-slab>

  <task-slab class="tb"
      :task="taskShortName(jobNoProgress())"
      ></task-slab>
  <task-slab class="tb"
      :task="taskShortName(jobLowProgress())"
      ></task-slab>
  <task-slab class="tb"
      :task="taskShortName(jobHighProgress())"
      ></task-slab>
  
  <task-slab class="tb"
      :task="taskShortName(null)"
      ref="runPending"
      ></task-slab>
  <task-slab class="tb"
      :task="taskShortName(null)"
      ref="runError"
      ></task-slab>
  <task-slab class="tb"
      :task="taskShortName(null)"
      ref="runResolved"
      ></task-slab>
</div>
</template>

<script>

import TaskSlab from '../admin/TaskSlab.vue';

export default {
  components: {
    TaskSlab,
  },

  data() {
    return {
    };
  },

  mounted() {
    this.$refs.runPending.awaitRunResult(pendingPromise());
    this.$refs.runError.awaitRunResult(errorPromise());
    this.$refs.runResolved.awaitRunResult(resolvedPromise());
  },

  methods: {
    taskSimple(job) {
      return {
        name: 'scrib-cowling',
        displayName: 'Scrub engine cowling',
        description: `Get to work! Those asteroids won't mine themselves!`,
        job: job,
      }
    },

    taskShortName(job) {
      return {
        name: 'scrib-cowling',
        displayName: 'Fix droids',
        description: `That scavenged astromech has been looking at me funny.`,
        job: job,
      }
    },

    taskExtraLongText(job) {
      return {
        name: 'scrib-cowling',
        displayName: 'Scrub filthy engine cowling',
        description: `Get to work! Those asteroids won't mine themselves!`
            + ` Can you even hear me, pipsqueak?!`,
        job: job,
      }
    },

    jobSimple() {
      return {
        id: 1,
        task: 'scrib-cowling',
        startTime: 1,
        progress: null,
        progressLabel: null,
      };
    },
    
    jobLabel() {
      return {
        id: 1,
        task: 'scrib-cowling',
        startTime: 1,
        progress: null,
        progressLabel: 'Starting...',
      };
    },

    jobNoProgress() {
      return {
        id: 1,
        task: 'scrib-cowling',
        startTime: 1,
        progress: 0,
        progressLabel: null,
      };
    },

    jobLowProgress() {
      return {
        id: 1,
        task: 'scrib-cowling',
        startTime: 1,
        progress: 0.27,
        progressLabel: 'Starting...',
      };
    },

    jobHighProgress() {
      return {
        id: 1,
        task: 'scrib-cowling',
        startTime: 1,
        progress: 0.97,
        progressLabel: 'Starting...',
      };
    },
  }
}

function pendingPromise() {
  return new Promise(() => {});
}

function errorPromise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject(new Error('A terrible error has occurred.'));
    }, 1000);
  });
}

function resolvedPromise() {
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
