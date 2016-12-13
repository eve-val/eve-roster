<template>
<div class="root">
  <div>
    <div v-if="!characterHasApiKeys"
        class="noKeyWarning">
      No API key defined for this character!
    </div>

    First,
    <a href="https://community.eveonline.com/support/api-key/CreatePredefined?accessMask=3280339210"
        target="_blank"
        >
      generate an API key</a>
    for <strong>all characters</strong> with <strong>no expiry</strong>.
  </div>
  <div>
    <input v-model="apiKeyId" placeholder="Key ID">
  </div>
  <div>
    <input v-model="apiKeyVerificationCode" placeholder="Verification Code">
  </div>
  <button
      @click="onApiKeySubmitClick"
      :disabled="!apiInputIsValid"
      >Submit</button>
</div>
</template>

<script>
// Access mask: 3280339210
// https://community.eveonline.com/support/api-key/CreatePredefined?accessMask=67113091

export default {
  props: {
    characterHasApiKeys: { type: Boolean, required: true }
  },

  data: function() {
    return {
      apiKeyId: null,
      apiKeyVerificationCode: null,
    }
  },

  computed: {
    apiInputIsValid: function() {
      return this.apiKeyId != null && this.apiKeyId != '' &&
          this.apiKeyVerificationCode != null &&
          this.apiKeyVerificationCode != '';
    }
  },

  methods: {
    onApiKeySubmitClick: function(ev) {
      console.log('Api key stuff:', this.apiKeyId, this.apiKeyVerificationCode);
    },
  }
}
</script>

<style scoped>
.root {
  padding-top: 10px;
}

.noKeyWarning {
  padding: 10px;
  margin: 10px;
  background: #FAED98;
  border: 1px solid #FADE2A;
}
</style>