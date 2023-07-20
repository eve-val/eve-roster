<template>
  <admin-wrapper title="Setup" :identity="identity">
    <textarea
      v-model="setupJson"
      class="main-input"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
    />
    <div style="margin-top: 8px">
      <button
        class="roster-btn submit-btn"
        :enabled="!savingSetup"
        @click="onSubmitClick"
      >
        Submit
      </button>
      <loading-spinner
        class="spinner"
        display="block"
        size="34px"
        :promise="promise"
      />
    </div>

    <div class="section-title">SRP</div>
    <srp-setup />
  </admin-wrapper>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";

import AdminWrapper from "./AdminWrapper.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import SrpSetup from "./setup/SrpSetup.vue";

const JSON_COMMENT_PATTERN = /\s*\/\/[^\n]*\n?/g;

import { Identity } from "../home";
import { AxiosResponse } from "axios";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AdminWrapper,
    LoadingSpinner,
    SrpSetup,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      setupJson: "",
      savingSetup: false,
      promise: null,
    } as {
      setupJson: string;
      savingSetup: boolean;
      promise: Promise<any> | null;
    };
  },

  mounted() {
    const promise = ajaxer.getAdminSetup();
    this.promise = promise;
    promise.then(
      (response: AxiosResponse<string>) => {
        this.setupJson = JSON.stringify(response.data, null, 2);
      },
      () => {},
    );
  },

  methods: {
    onSubmitClick() {
      if (this.savingSetup) {
        return;
      }
      this.savingSetup = true;

      const promise = Promise.resolve()
        .then(() => {
          let cleanedJson = this.setupJson.replace(JSON_COMMENT_PATTERN, "");
          // eslint-disable-next-line @typescript-eslint/no-unsafe-return
          return JSON.parse(cleanedJson);
        })
        .then((setupJson: string) => {
          return ajaxer.putAdminSetup(setupJson);
        });
      this.promise = promise;
      promise.finally(() => {
        this.savingSetup = false;
      });
    },
  },
});
</script>

<style scoped>
.main-input {
  width: 720px;
  height: 600px;
  font-family: monospace;
  font-size: 14px;
  color: #cdcdcd;
  background: #1b1b1b;
  border: 1px solid #584732;
  padding: 8px;
}

.main-input:focus {
  outline: none;
  border-color: #7b5f3a;
}

.submit-btn {
  width: 115px;
  height: 38px;
  font-size: 14px;
}

.spinner {
  margin-top: 8px;
}

.section-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 50px 0 20px;
}
</style>
