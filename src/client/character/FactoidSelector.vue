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

import { PropType, defineComponent } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  props: {
    options: { type: Array as PropType<Option[]>, required: true },
    initialValue: { type: String, required: false, default: "" },
    submitHandler: {
      type: Function as PropType<(value: string) => Promise<any>>,
      required: true,
    },
  },

  data() {
    return {
      selectedValue: this.initialValue,
      promise: null as Promise<any> | null,
    };
  },

  watch: {
    selectedValue: function (value) {
      const promise = this.submitHandler(value);
      this.promise = promise;
    },
  },
});

export interface Option {
  label: string;
  value: string;
}
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
