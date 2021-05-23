<!--

A component that either looks like a "load more" button or a loading spinner.

-->

<template>
  <div class="_more-button">
    <loading-spinner
      ref="spinner"
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

<script>
import LoadingSpinner from "../shared/LoadingSpinner.vue";

export default {
  components: {
    LoadingSpinner,
  },

  props: {
    promise: { type: Promise, required: false, default: Promise.resolve() },
    hideButton: { type: Boolean, required: false },
  },

  emits: ["fetch-requested"],

  data() {
    return {
      status: "inactive", // inactive | active | error
    };
  },

  watch: {
    promise(value) {
      this.observe(value);
    },
  },

  mounted() {
    this.observe(this.promise);
  },

  methods: {
    observe(promise) {
      this.$refs.spinner.observe(promise);
      if (promise != null) {
        this.status = "active";
        this.promise
          .then(() => {
            if (promise == this.promise) {
              this.status = "inactive";
            }
          })
          .catch((_e) => {
            if (promise == this.promise) {
              this.status = "inactive";
            }
          });
      } else {
        this.status = "inactive";
      }
    },

    onButtonClick(_e) {
      if (this.status != "active") {
        this.$emit("fetch-requested");
      }
    },
  },
};
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
