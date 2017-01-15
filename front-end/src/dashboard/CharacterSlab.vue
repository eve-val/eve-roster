<template>
<div class="slab-root">
  <div class="slab-main"
    @mouseleave="onMouseOut"
    >
    <eve-image :id="character.id" :size="105" type="Character" />
    <div class="body">
      <div>
        <router-link
            class="name"
            :to="'/character/' + character.id"
            >{{ character.name }}</router-link>
        <img class="main-marker"
            v-if="isMain && highlightMain"
            src="../assets/main-star.png"
            >
      </div>
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
    <div class="menu" v-if="!isMain && access['designateMain'] == 2">
      <div class="menu-arrow" @mousedown="$refs.menu.toggle()"></div>
      <drop-menu class="menu-body" ref="menu"
          :rootStyle="{
            position: 'absolute',
            right: '7px',
            top: '18px',
          }"
          >
        <div class="menu-item" @click="onDesignateAsMainClick">
          Designate as main
        </div>
      </drop-menu>
    </div>
    <loading-spinner
        v-if="designateMainPromise != null"
        class="designate-main-spinner"
        :size="13"
        :promise="designateMainPromise"
        gravity="left"
        actionLabel="designating this character as your main"
        />
  </div>
  <div class="auth-bother-container"
      v-if="character.needsReauth"
      >
    <div class="auth-bother-title">Character needs to be re-authorized</div>
    Please
    <a :href="'https://login.eveonline.com/oauth/authorize?' + loginParams"
        >log in</a>
    as {{ character.name }}.
  </div>
</div>
</template>

<script>
import ajaxer from '../shared/ajaxer';

import DropMenu from '../shared/DropMenu.vue';
import EveImage from '../shared/EveImage.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';


export default {
  components: {
    DropMenu,
    EveImage,
    LoadingSpinner,
  },

  props: {
    accountId: { type: Number, required: true, },
    character: { type: Object, required: true },
    isMain: { type: Boolean, required: true },
    highlightMain: { type: Boolean, required: true },
    loginParams: { type: String, required: true },
    access: { type: Object, required: true },
  },

  data: function() {
    return {
      queueFetchStatus: 'loading',
      skillInTraining: null,
      queue: null,

      designateMainPromise: null,
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
  },

  created: function() {
    ajaxer.getSkillQueueSummary(this.character.id)
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
    onMouseOut(e) {
      if (this.$refs.menu) {
        this.$refs.menu.hide();
      }
    },

    onDesignateAsMainClick(e) {
      this.$refs.menu.hide();
      this.designateMainPromise = ajaxer
      .putAccountMainCharacter(this.accountId, this.character.id)
      .then(() => {
        this.$emit('designatedNewMain', this.character.id);
        this.designateMainPromise = null;
      });
    },
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
  position: relative;
  user-select: none;
  cursor: default;

  transition: box-shadow 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.slab-main:hover {
  /*box-shadow: 0 0 8px rgba(255, 255, 255, 0.05);*/
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

.main-marker {
  width: 12px;
  height: 12px;
  margin-left: 2px;
  position: relative;
  top: -1px;
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

.queue-summary, .training-remaining, {
  font-size: 12px;
  color: #a7a29c;
}

.auth-bother-container {
  background: #3d3d3d;
  padding: 12px;
}

.auth-bother-title {
  font-size: 16px;
  margin-bottom: 6px;
  color: #a7a29c;
}

.menu {
  display: inline-block;
  position: absolute;
  right: 0;
  top: 0;
  opacity: 0;
  transition: opacity 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.slab-main:hover > .menu {
  opacity: 1;
}

.menu-arrow {
  width: 25px;
  height: 22px;
  background-image: url('../assets/dashbaord-character-menu-arrow.png');
  background-size: cover;
}

.menu-arrow:hover {
  background-position: 0 100%;
}

.menu-item {
  padding: 8px 11px;
  white-space: nowrap;
}

.menu-item:hover {
  background: #4b4b4b;
}

.designate-main-spinner {
  position: absolute;
  right: 24px;
  top: 2px;
}

</style>
