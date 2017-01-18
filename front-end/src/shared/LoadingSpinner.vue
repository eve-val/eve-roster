<template>
<div
    :style="{
      display: errorMode == 'text' ? 'block' : 'inline'
    }">
  <tooltip v-if="errorMessage == null || errorMode == 'icon'"
           :gravity="gravity"
           :message="errorMessage">
      <img class="spinner"
          :src="imgSrc"
          :style="{
            width: size + 'px',
            height: size + 'px',
          }"
          >
  </tooltip>

  <div class="block-message" v-if="status == 'error' && errorMode == 'text'">
    <img class="error-icon" src="../assets/error-icon.svg">{{ errorMessage }}
  </div>
</div>
</template>

<script>

import Tooltip from './Tooltip.vue';

const ERROR_MODES = ['text', 'icon'];

const spinnerPath = require('../assets/spinner.svg');
const errorPath = require('../assets/spinner-error.svg');

export default {
  components: {
    Tooltip
  },

  props: {
    size: { type: Number, required: true, },
    promise: { type: Promise, required: false, },
    errorMode: {
      type: String,
      required: false,
      default: 'icon', 
      validator: function(value) {
        return value == 'icon' || value == 'text';
      },
    },
    gravity: {
      type: String,
      required: false,
      default: 'right', 
      validator: function(value) {
        return value == 'left' || value == 'right';
      },
    },
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
    imgSrc() {
      switch (this.status) {
        case 'loading':
          return spinnerPath;
        case 'error':
          return errorPath;
        default:
          return spinnerPath;
      }
    },
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

.error-icon {
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
