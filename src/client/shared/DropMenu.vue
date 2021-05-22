<template>
  <div class="_drop-menu">
    <div
      v-if="shown"
      class="content"
      :style="rootStyle"
      @mousedown="onLocalMouseDown"
    >
      <slot />
    </div>
  </div>
</template>

<script>
export default {
  props: {
    rootStyle: { type: Object, required: false },
  },

  data: function () {
    return {
      shown: false,
    };
  },

  watch: {
    shown: function (value) {
      // Set a slight delay to allow for any currently-dispatching mousedown
      // event to finish dispatching.
      setTimeout(() => {
        if (this.destroyed) {
          return;
        }

        if (this.globalListener == null) {
          this.globalListener = this.onGlobalMouseDown.bind(this);
        }

        if (this.shown) {
          document.body.addEventListener("mousedown", this.globalListener);
        } else {
          document.body.removeEventListener("mousedown", this.globalListener);
        }
      });
    },
  },

  destroyed() {
    document.body.removeEventListener("mousedown", this.globalListener);
    this.destroyed = true;
  },

  methods: {
    show() {
      this.shown = true;
    },

    hide() {
      this.shown = false;
    },

    toggle() {
      this.shown = !this.shown;
    },

    onGlobalMouseDown(e) {
      // Close-enough heuristic to see whether we saw this event in the
      // onLocalMouseDown handler.
      if (e.timeStamp != this.prevMousedownTimestamp) {
        this.hide();
      }
    },

    onLocalMouseDown(e) {
      this.prevMousedownTimestamp = e.timeStamp;
    },
  },
};
</script>

<style scoped>
.content {
  min-width: 150px;
  max-width: 350px;
  background: #3e3e3e;
  border: 1px solid #2d2d2d;
  box-shadow: 0px 1px 4px 1px rgba(0, 0, 0, 0.32);
}
</style>
