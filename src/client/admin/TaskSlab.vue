<template>
  <div class="_task-block" :style="rootStyle" :class="rootClasses">
    <div class="progress-bar" :style="progressBarStyle" />
    <div class="foreground">
      <div class="task-name">
        {{ task.displayName }}
      </div>
      <div class="middle-area">
        <span v-if="task.job" style="color: #e1c87b">{{
          task.job.progressLabel || ""
        }}</span>
        <span v-else style="color: #9d9d9d">{{ task.description }}</span>
      </div>
      <div class="right-area">
        <div
          v-if="task.job && task.job.progress != null"
          class="progress-percentage"
        >
          {{ Math.round(task.job.progress * 100) }}%
        </div>
        <div v-if="!task.job" class="run-block">
          <loading-spinner
            ref="runSpinner"
            class="run-spinner"
            display="inline"
            default-state="hidden"
          />
          <button
            class="roster-btn run-btn"
            :disabled="runPromise != null"
            @click="onRunClick"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import Promise from "bluebird";
import ajaxer from "../shared/ajaxer";

import LoadingSpinner from "../shared/LoadingSpinner.vue";

export default {
  components: {
    LoadingSpinner,
  },

  props: {
    task: { type: Object, required: true },
  },

  emits: ["jobStarted"],

  data: () => ({
    runPromise: null,
  }),

  computed: {
    rootStyle() {
      let bgColor;
      if (this.task.job && this.task.job.progress != null) {
        bgColor = "#2e291e";
      } else if (this.task.job) {
        bgColor = "#7c6214";
      } else {
        bgColor = "#292929";
      }

      return {
        backgroundColor: bgColor,
      };
    },

    rootClasses() {
      let classes = [];
      if (this.task.job) {
        classes.push("chevron-background");
      }
      return classes;
    },

    progressBarStyle() {
      let widthPerc = (this.task.job && this.task.job.progress) || 0;
      return {
        width: widthPerc * 100 + "%",
      };
    },

    middleText() {
      if (this.task.job) {
        return this.task.job.progressLabel;
      } else {
        return this.task.description;
      }
    },
  },

  methods: {
    onRunClick() {
      if (this.runPromise == null) {
        this.awaitRunResult(ajaxer.putAdminTask(this.task.name));
      }
    },

    awaitRunResult(promise) {
      promise = this.$refs.runSpinner
        .observe(Promise.resolve(promise))
        .then(() => {
          this.$emit("jobStarted", this.task.name);
        })
        .finally(() => {
          if (this.runPromise == promise) {
            this.runPromise = null;
          }
        });
      this.runPromise = promise;
    },
  },
};
</script>

<style scoped>
._task-block {
  position: relative;
  height: 36px;
  font-size: 14px;
  font-weight: normal;
}

.chevron-background {
  background-image: url("./res/progress-chevron.svg");
  background-size: auto 100%;

  animation: chevron-slide;
  animation-duration: 1000ms;
  animation-iteration-count: infinite;
  animation-timing-function: linear;
}

@keyframes chevron-slide {
  from {
    background-position-x: 0;
  }
  to {
    background-position-x: 35px;
  }
}

.progress-bar {
  position: absolute;
  height: 100%;
  background: #a5841d;
  /*transition: width 400ms cubic-bezier(0.215, 0.61, 0.355, 1);*/
}

.foreground {
  height: 100%;
  position: relative;
  display: flex;
  flex-direction: row;
  align-items: center;
}

.task-name {
  color: #fff;
  padding-left: 10px;
  min-width: 150px;
  box-sizing: border-box;
}

.middle-area {
  flex: 1;
  text-overflow: ellipsis;
  white-space: nowrap;
  overflow: hidden;
  margin: 0 10px;
}

.progress-percentage {
  color: #cdcdcd;
  margin-right: 13px;
}

.run-block {
  margin-right: 6px;
}

.run-btn {
  width: 76px;
  height: 26px;
  box-sizing: border-box;
}

.run-spinner {
  margin-right: 3px;
}
</style>
