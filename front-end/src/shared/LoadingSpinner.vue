<template>
<div
    :style="{
      display: messageMode == 'text' ? 'block' : 'inline'
    }">
  <tooltip
      v-if="status == 'loading' || (messageMode == 'icon' && errOrMsg != null)"
      :gravity="gravity"
      >
    <img class="spinner"
        :src="spinnerSrc"
        :style="{
          width: size + 'px',
          height: size + 'px',
        }"
        >
    <span slot="message" v-if="errOrMsg != null">{{ errOrMsg }}</span>
  </tooltip>

  <div class="block-message"
       v-if="messageMode == 'text' && (status == 'error' || errOrMsg != null)">
    <img class="text-icon" :src="iconSrc">{{ errOrMsg }}
  </div>
</div>
</template>

<script>

import Tooltip from './Tooltip.vue';

const MESSAGE_MODES = ['text', 'icon'];

const spinnerPath = {
  'loading': require('../assets/spinner.svg'),
  'loaded': require('../assets/spinner-warning.svg'),
  'error': require('../assets/spinner-error.svg'),
};

const iconPath = {
  'loading': require('../assets/spinner.svg'),
  'loaded': require('../assets/warning-icon.svg'),
  'error': require('../assets/error-icon.svg'),
};

export default {
  components: {
    Tooltip
  },

  props: {
    size: { type: Number, required: true, },
    promise: { type: Promise, required: false, },
    messageMode: {
      type: String,
      required: false,
      default: 'icon', 
      validator: function(value) {
        for (let e of MESSAGE_MODES) {
          if (value == e) {
            return true;
          }
        }
        return false;
      },
    },
    gravity: {
      type: String,
      required: false,
      default: 'right',
    },
    message: { type: String, required: false, },
    actionLabel: { type: String, required: false, },
    rethrowError: { type: Boolean, required: false, default: false, },
  },

  data: function() {
    return {
      status: 'loading',
      errorMessage: null,
    };
  },

  computed: {
    spinnerSrc() {
      if (this.status in spinnerPath) {
        return spinnerPath[this.status];
      } else {
        return spinnerPath['loading'];
      }
    },

    iconSrc() {
      if (this.status in iconPath) {
        return iconPath[this.status];
      } else {
        return iconPath['loading'];
      }
    },

    errOrMsg() {
      return this.errorMessage || this.message;
    }
  },

  watch: {
    promise: function(value) {
      this.updatePromiseHandling(value);
    },
  },

  created: function() {
    this.updatePromiseHandling(this.promise);
  },

  methods: {
    updatePromiseHandling(promise) {
      this.status = 'loading';
      this.errorMessage = null;
      if (!promise) {
        return;
      }
      promise
      .then(() => {
        this.status = 'loaded';
      })
      .catch(e =>  {
        this.status = 'error';
        let actionLabel = this.actionLabel || 'retrieving this resource';
        let message;
        if (typeof e == 'string') {
          message = e;
        } else if (e.message) {
          message =
              `There was an error while ${actionLabel}. ("${e.message}").`;
        } else {
          message = `There was an error while ${actionLabel}.`;
        }
        this.errorMessage = message;

        if (this.rethrowError) {
          throw e;
        }
      });
    },
  },
}
</script>

<style scoped>
.spinner {
  vertical-align: text-bottom;
}

.text-icon {
  width: 15px;
  height: 15px;
  margin-right: 5px;
  position: relative;
  top: 1px;
}

.block-message {
  display: inline-block;
  padding: 8px 9px;
  font-size: 14px;
  color: #cdcdcd;
  background: #3B342C;
  border-radius: 2px;
}

</style>
