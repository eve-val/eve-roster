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
            :promise="promise"
            class="run-spinner"
            display="inline"
            default-state="hidden"
          />
          <button
            class="roster-btn run-btn"
            :disabled="promise != null"
            @click="onRunClick"
          >
            Run
          </button>
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";

import LoadingSpinner from "../shared/LoadingSpinner.vue";
import { Task } from "./types";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  props: {
    task: { type: Object as PropType<Task>, required: true },
  },

  emits: ["jobStarted"],

  data() {
    return {
      promise: null,
    } as {
      promise: Promise<any> | null;
    };
  },

  computed: {
    rootStyle(): { backgroundColor: string } {
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

    rootClasses(): string[] {
      let classes = [];
      if (this.task.job) {
        classes.push("chevron-background");
      }
      return classes;
    },

    progressBarStyle(): { width: string } {
      let widthPerc = this.task.job?.progress || 0;
      return {
        width: widthPerc * 100 + "%",
      };
    },

    middleText(): string {
      return this.task.job?.progressLabel || this.task.description;
    },
  },

  watch: {
    promise: function () {
      const promise = this.promise;
      if (promise == null) {
        return;
      }
      promise
        .then(() => {
          this.$emit("jobStarted", this.task.name);
        })
        .finally(() => {
          this.promise = null;
        });
    },
  },

  methods: {
    onRunClick() {
      this.promise = ajaxer.putAdminTask(this.task.name);
    },
  },
});
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
