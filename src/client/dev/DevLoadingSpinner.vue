<template>
  <div class="_dev-loading-spinner">
    <div>
      <div class="title">Font sizes</div>

      <div class="fake-title">
        Font 30 text w/ default sized spinner
        <loading-spinner />
      </div>

      <div style="font-size: 16px">
        This is 16px text w/ default sized spinner
        <loading-spinner />
      </div>

      <div style="font-size: 14px">
        This is 14px text w/ default sized spinner
        <loading-spinner />
      </div>

      <div style="font-size: 12px">
        This is 12px text w/ default sized spinner
        <loading-spinner />
      </div>

      <div class="fake-title">
        Font 30 text w/ tiny spinner
        <loading-spinner size="12px" />
      </div>
    </div>
    <!-- end text size comparison -->

    <div>
      <div class="title">States</div>
      <div>
        Inline spinning state
        <loading-spinner state="spinning" />
      </div>

      <div>
        Block spinning state
        <loading-spinner display="block" state="spinning" />
      </div>

      <div>
        Inline error state
        <loading-spinner state="error" />
      </div>

      <div>
        Inline error state with hover text
        <loading-spinner state="error" adversity-message="There was an error" />
      </div>

      <div>
        Inline warning state
        <loading-spinner state="warning" />
      </div>

      <div>
        Inline warning state with hover text
        <loading-spinner
          state="warning"
          adversity-message="Warning: bad things are about to happen."
        />
      </div>

      <div class="block-wrapper">
        <loading-spinner
          display="block"
          state="error"
          adversity-message="Something terrible has occurred."
        />
      </div>

      <div class="block-wrapper">
        <loading-spinner
          display="block"
          state="warning"
          adversity-message="Warning: Something terrible might have occurred."
        />
      </div>

      <div>
        Inline hidden state
        <loading-spinner state="hidden" />
      </div>

      <div>
        Block hidden state
        <loading-spinner display="block" state="hidden" />
      </div>
    </div>
    <!-- end states -->

    <div>
      <div class="title">Promises</div>

      <div>
        Inline pending
        <loading-spinner :promise="inlinePending" />
      </div>

      <div>
        Block pending
        <loading-spinner :promise="blockPending" display="block" />
      </div>

      <div>
        Inline error
        <loading-spinner :promise="inlineError" />
      </div>

      <div>
        Block error
        <loading-spinner :promise="blockError" display="block" />
      </div>

      <div>
        Inline resolved
        <loading-spinner :promise="inlineResolved" />
      </div>

      <div>
        Block resolved
        <loading-spinner :promise="blockResolved" display="block" />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import { defineComponent } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  data() {
    return {
      inlinePending: pendingPromise(),
      blockPending: pendingPromise(),
      inlineError: errorPromise(),
      blockError: errorPromise(),
      inlineResolved: resolvedPromise(),
      blockResolved: resolvedPromise(),
    };
  },
});

function pendingPromise() {
  return new Promise(() => {});
}

function errorPromise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("A terrible error has occurred");
    }, 1000);
  });
}

function resolvedPromise() {
  return Promise.resolve();
}
</script>

<style scoped>
._dev-loading-spinner {
  line-height: 2;
}

.title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 5px 0;
  font-weight: 300;
}

.fake-title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
}

.block-wrapper {
  line-height: 1.1;
  margin: 10px 0 10px 0;
}
</style>
