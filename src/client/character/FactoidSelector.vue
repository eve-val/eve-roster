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
      ref="spinner"
      class="loading-spinner"
      default-state="hidden"
      size="16px"
    />
  </div>
</template>

<script>
import LoadingSpinner from "../shared/LoadingSpinner.vue";

export default {
  components: {
    LoadingSpinner,
  },

  props: {
    options: { type: Array, required: true },
    initialValue: { type: String, required: false, default: "" },
    submitHandler: { type: Function, required: true },
  },

  data: function () {
    return {
      selectedValue: this.initialValue,
    };
  },

  watch: {
    selectedValue: function (value) {
      this.$refs.spinner.observe(this.submitHandler(value || null));
    },
  },
};
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
