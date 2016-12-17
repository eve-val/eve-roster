<template>
<div class="slab-root">
  <div class="slab-main">
    <eve-image :id="character.id" :size="105" type="Character" />
    <div class="body">
      <router-link
          class="name"
          :to="'/character/' + character.id"
          >{{ character.name }}</router-link>
      <div class="training-summary">
        <div class="training-track"
            :class="{
              errorState: !character.hasApiKey || character.queue == null
            }"
            >
          <div class="training-progress"
              v-if="character.skillInTraining != null"
              :style="{ width: character.skillInTraining.progress * 100 + '%' }"
              ></div>
          <span class="training-label">{{ trainingLabel }}</span>
        </div><span
            v-if="character.skillInTraining != null"
            class="training-remaining"
            >{{ character.skillInTraining.timeRemaining }}</span>
      </div>
      <div class="queue-summary" v-if="character.queue != null">
        {{ character.queue.timeRemaining }} left in queue
        ({{ character.queue.count}} skills)
      </div>
    </div>
  </div>
  <div class="key-bother-container"
      v-if="!character.hasApiKey"
      >
    <div class="key-title">Last step: add an API key</div>
    Create a <a :href="keyGenUrl">new API key</a> with those predefined
    permissions. Checking "No expiry" is recommended.
    <div class="key-input-root-container">
      <div class="key-input-container" style="width: 90px; flex: 0 0 auto;">
        <label class="key-input-label" for="key-id-input">Key ID</label>
        <input id="key-id-input"
            class="key-input"
            v-model="keyId"
            ></input>
      </div>
      <div class="key-input-container" style="flex: 1; margin-left: 20px;">
        <label class="key-input-label"
            for="key-verification-input"
            >Verification Code</label>
        <input id="key-verification-input"
            class="key-input"
            v-model="keyVerification"
            ></input>
      </div>
    </div>
    <div style="margin-top: 30px">
      <button
          class="key-submit-btn"
          :disabled="!keyInputIsValid"
          @click="onKeySubmitClick"
          >Submit</button>
    </div>
  </div>
</div>
</template>

<script>
import EveImage from '../shared/EveImage.vue';

export default {
  components: {
    EveImage,
  },

  props: {
    character: { type: Object, required: true },
  },

  data: function() {
    return {
      keyId: null,
      keyVerification: null,
    };
  },

  computed: {
    trainingLabel: function() {
      if (!this.character.hasApiKey) {
        return 'Missing API key!';
      } else if (this.character.skillInTraining == null) {
        return 'No skill training'
      } else {
        return this.character.skillInTraining.name;
      }
    },

    accessMask: function() {
      return 3280339210;
    },

    keyGenUrl: function() {
      return 'https://community.eveonline.com/support/api-key/' +
          'CreatePredefined?accessMask=' + this.accessMask;
    },

    keyInputIsValid: function() {
      return this.keyId != null && this.keyId.trim() != '' &&
          this.keyVerification != null && this.keyVerification.trim() != '';
    }
  },

  methods: {
    onKeySubmitClick: function() {
      this.$emit(
          'setApiKey', this.character.id, this.keyId, this.keyVerification);
    }
  }
}
</script>

<style scoped>
.slab-root {
  width: 480px;
}

.slab-main {
  border: 1px solid #2d2318;
  background: #101010;
  height: 105px;
  display: flex;
}

.body {
  padding: 11px 10px 0 10px;
}

.name {
  font-size: 16px;
  color: #cdcdcd;
  text-decoration: none;
}

.name:hover {
  text-decoration: underline;
}

.name:active {
  color: #aaa;
}

.training-track {
  position: relative;
  display: inline-block;
  width: 270px;
  height: 22px;
  margin: 9px 0 11px 0;
  padding-top: 5px;
  background: #26221e;
}

.training-track.errorState {
  background: url('../assets/barberpole-error.png');
}

.training-progress {
  position: absolute;
  left: 0;
  top: 0;
  height: 100%;
  background: linear-gradient(to bottom, #75615c 0%,#534539 50%,#534539 50%);
}

.training-label {
  margin-left: 6px;
  position: relative;
}

.training-remaining {
  margin-left: 6px;
}

.queue-summary, .training-remaining, .key-input-label {
  font-size: 12px;
  color: #a7a29c;
}

.key-bother-container {
  background: #3d3d3d;
  padding: 12px;
}

.key-title {
  font-size: 16px;
  margin-bottom: 6px;
  color: #a7a29c;
}

.key-input-root-container {
  display: flex;
  margin-top: 22px;
}

.key-input-label {
  display: block;
}

.key-input-container {
  display: flex;
  flex-direction: column;
}

.key-input {
  display: block;
  margin-top: 4px;
  background: #2f2f2f;
  border: 1px solid #545454;
  color: #9c9c9c;
  font-size: 14px;
  font-family: monospace;
  padding: 5px;
}

.key-submit-btn {
  width: 117px;
  height: 36px;
  color: #cdcdcd;
  background: #5c4e3f;
  border: 1px solid #7e6d5b;
  box-shadow: inset 0 0 7px 1px rgba(255, 255, 255, 0.06);
  font-size: 14px;
  font-family: 'Helvetica Neue', 'Calibri', Arial, sans-serif;
  font-weight: 300;
}

.key-submit-btn[disabled] {
  opacity: 0.5;
}

.key-submit-btn:active {
  color: #ffffff;
}

</style>