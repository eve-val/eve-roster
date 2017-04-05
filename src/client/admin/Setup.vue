<template>
<admin-wrapper title="Setup" :identity="identity">
  <textarea
      class="main-input"
      v-model="setupJson"
      autocomplete="off"
      autocorrect="off"
      autocapitalize="off"
      spellcheck="false"
      ></textarea>
  <div style="margin-top: 8px">
    <button
        class="roster-btn submit-btn"
        :enabled="dataPromise != null"
        @click="onSubmitClick"
        >Submit</button>
    <loading-spinner
        v-if="dataPromise != null"
        class="spinner"
        :size="34"
        :promise="dataPromise"
        messageMode="text"
        />
  </div>
</admin-wrapper>
</template>

<script>
import moment from 'moment';

import ajaxer from '../shared/ajaxer';

import AdminWrapper from './AdminWrapper.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';


const JSON_COMMENT_PATTERN = /\s*\/\/[^\n]*\n?/g;

export default {
  components: {
    AdminWrapper,
    LoadingSpinner,
  },

  props: {
    identity: { type: Object, required: true, },
  },

  data() {
    return {
      setupJson: "",
      dataPromise: null,
    };
  },

  created() {
    this.dataPromise = ajaxer.getAdminSetup()
    .then(response => {
      this.setupJson = JSON.stringify(response.data, null, 2);
    });
  },

  methods: {
    onSubmitClick() {
      this.dataPromise = Promise.resolve()
      .then(() => {
        let cleanedJson = this.setupJson.replace(JSON_COMMENT_PATTERN, '');
        return JSON.parse(cleanedJson);
      })
      .then(setupJson => {
        return ajaxer.putAdminSetup(setupJson);
      });
    },
  },
}
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
</style>
