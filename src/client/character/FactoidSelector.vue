<template>
  <div class="factoid-selector">
    <select v-model="selectedValue" class="selector">
      <option :value="null">Not assigned</option>
      <option
        v-for="option in options"
        :key="option.value"
        :value="option.value"
      >
        {{ option.label }}
      </option>
    </select>
    <loading-spinner
      :promise="promise"
      class="loading-spinner"
      default-state="hidden"
      size="16px"
    />
  </div>
</template>

<script lang="ts">
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import { defineComponent } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  props: {
    options: { type: Array, required: true },
    initialValue: { type: String, required: false, default: "" },
    submitHandler: { type: Function, required: true },
  },

  data() {
    return {
      selectedValue: this.initialValue,
      promise: null,
    } as {
      selectedValue: string;
      promise: Promise<any> | null;
    };
  },

  watch: {
    selectedValue: function (value) {
      const promise = this.submitHandler(value || null);
      this.promise = promise;
    },
  },
});
</script>

<style scoped>
.factoid-selector {
  margin-top: 4px;
}

.selector {
  width: 200px;
}

.loading-spinner {
  margin-left: 3px;
}
</style>
