<!--

A component that either looks like a "load more" button or a loading spinner.

-->

<template>
  <div class="_more-button">
    <loading-spinner
      :promise="promise"
      class="spinner"
      display="block"
      size="34px"
      default-state="hidden"
    />
    <button
      v-if="status != 'active' && !hideButton"
      class="btn"
      :style="{
        marginTop: status == 'error' ? '15px' : undefined,
      }"
      @click="onButtonClick"
    >
      {{ status == "error" ? "Retry" : "More" }}
    </button>
  </div>
</template>

<script lang="ts">
import LoadingSpinner from "../shared/LoadingSpinner.vue";

const STATUSES = ["inactive", "active", "error"] as const;
type Status = typeof STATUSES[number];

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  props: {
    promise: {
      type: Promise as PropType<Promise<any> | null>,
      required: false,
      default: null,
    },
    hideButton: {
      type: Boolean,
      required: false,
      default: false,
    },
  },

  emits: ["fetch-requested"],

  data() {
    return {
      status: "inactive",
    } as {
      status: Status;
    };
  },

  watch: {
    promise() {
      const promise = this.promise;
      if (promise != null) {
        this.status = "active";
        promise
          .then(() => {
            this.status = "inactive";
          })
          .catch(() => {
            this.status = "error";
          });
      } else {
        this.status = "inactive";
      }
    },
  },

  methods: {
    onButtonClick() {
      if (this.status != "active") {
        this.$emit("fetch-requested");
      }
    },
  },
});
</script>

<style scoped>
._more-button {
  display: inline-flex;
  width: 125px;
  min-height: 36px;

  flex-direction: column;
  align-items: center;
  justify-content: center;
}

.btn {
  font-size: 14px;
  width: 125px;
  height: 32px;
  box-sizing: border-box;

  background-color: #3b342c;
  border: 1px solid #5b5145;
  border-radius: 1px;
  color: #cdcdcd;
  outline: none;
}

.btn:active {
  filter: brightness(80%);
}
</style>
