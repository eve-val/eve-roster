<template>
  <div class="factoid-selector">
    <select class="selector" v-model="selectedValue">
      <option :value="null">Not assigned</option>
      <option v-for="option in options" :value="option.value">
        {{ option.label }}
      </option>
    </select>
    <loading-spinner
      class="loading-spinner"
      ref="spinner"
      defaultState="hidden"
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
    initialValue: { type: String, required: false },
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
