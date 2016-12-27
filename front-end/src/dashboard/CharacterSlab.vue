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
            :class="{ errorState: errorState }"
            >
          <div class="training-progress"
              :style="{ width: progressTrackWidth }"
              ></div>
          <span class="training-label"
              :class="{ loading: queueFetchStatus == 'loading' }"
              >{{ trainingLabel }}</span>
        </div><span
            v-if="skillInTraining != null"
            class="training-remaining"
            >{{ skillInTraining.timeRemaining }}</span>
      </div>
      <div class="queue-summary" v-if="queue != null">
        {{ queue.timeRemaining }} left in queue
        ({{ queue.count}} skills)
      </div>
    </div>
  </div>
  <div class="key-bother-container"
      v-if="character.needsReauth"
      >
    <div class="key-title">Character needs to be re-authorized</div>
    Please
    <a :href="'https://login.eveonline.com/oauth/authorize?' + loginParams"
        >log in</a>
    as {{ character.name }}.
  </div>
</div>
</template>

<script>
import ajaxer from '../shared/ajaxer';

import EveImage from '../shared/EveImage.vue';


export default {
  components: {
    EveImage,
  },

  props: {
    character: { type: Object, required: true },
    isMain: { type: Boolean, required: true },
    highlightMain: { type: Boolean, required: true },
    loginParams: { type: String, required: true },
  },

  data: function() {
    return {
      queueFetchStatus: 'loading',
      skillInTraining: null,
      queue: null,
    };
  },

  computed: {
    queueStatus: function() {
      if (this.queueFetchStatus == 'loading') {
        return 'loading';
      } else if (this.queueFetchStatus == 'error') {
        return 'loading-error';
      } else if (this.character.needsReauth) {
        return ''
      }
    },

    errorState: function() {
      return this.character.needsReauth ||
          this.queueFetchStatus == 'error' ||
          this.queueFetchStatus == 'loaded' && this.queue == null;
    },

    trainingLabel: function() {
      if (this.character.needsReauth) {
        return 'Needs authorization!';
      } else if (this.queueFetchStatus == 'loading') {
        return 'Loading...';
      } else if (this.queueFetchStatus == 'error') {
        return 'Error loading skill queue';
      } else if (this.skillInTraining == null) {
        return 'No skill training';
      } else {
        return this.skillInTraining.name;
      }
    },

    progressTrackWidth: function() {
      if (this.skillInTraining == null) {
        return '0';
      } else {
        return this.skillInTraining.progress * 100 + '%';
      }
    },

    keyGenUrl: function() {
      return 'https://community.eveonline.com/support/api-key/' +
          'CreatePredefined?accessMask=' + this.accessMask;
    },
  },

  created: function() {
    ajaxer.getSkillQueue(this.character.id)
      .then(response => {
        this.queueFetchStatus = 'loaded';
        this.skillInTraining = response.data.skillInTraining;
        this.queue = response.data.queue;
      })
      .catch(e => {
        this.queueFetchStatus = 'error';
      });
  },

  methods: {
  },
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
  user-select: none;
  cursor: default;

  transition: box-shadow 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.slab-main:hover {
  box-shadow: 0 0 8px rgba(255, 255, 255, 0.05);
  border-color: #352d24;
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
  width: 0;
  height: 100%;
  background: linear-gradient(to bottom, #75615c 0%,#534539 50%,#534539 50%);
  transition: width 500ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.training-label {
  margin-left: 6px;
  position: relative;
}

.training-label.loading {
  color: #a7a29c;
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