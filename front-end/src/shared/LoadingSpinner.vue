<template>
<div class="_loading-spinner"
    :style="{
      display: errorMode == 'text' ? 'block' : 'inline'
    }">
  <img class="spinner"
      v-if="errorMessage == null || errorMode == 'icon'"
      :src="imgSrc"
      :style="{
        width: size + 'px',
        height: size + 'px',
      }"
      >
  <template v-if="status == 'error'">
    <div class="block-message" v-if="errorMode == 'text'">
      <img class="error-icon" src="../assets/error-icon.svg">{{ errorMessage }}
    </div>
    <div class="hover-message-cnt"
        v-if="errorMode == 'icon'"
        :style="{
          left: size + 10 + 'px',
        }"
        >
      <div class="hover-message-triangle"
          :style="{
            top: size / 2 - 7 + 5 + 'px',
          }"></div>
      <div class="hover-message">
        {{ errorMessage }}
      </div>
    </div>
  </template>
</div>
</template>

<script>

const ERROR_MODES = ['text', 'icon'];

const spinnerPath = require('../assets/spinner.svg');
const errorPath = require('../assets/spinner-error.svg');

export default {
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
    rethrowError: { type: Boolean, required: false, default: false, },
  },

  data: function() {
    return {
      status: 'loading',
      errorMessage: null,
    };
  },

  computed: {
    imgSrc: function() {
      switch (this.status) {
        case 'loading':
          return spinnerPath;
        case 'error':
          return errorPath;
        default:
          return null;
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
        let message;
        if (typeof e == 'string') {
          message = e;
        } else if (e.message) {
          message =
              `There was an error retrieving this resource. ("${e.message}").`;
        } else {
          message = 'There was an error retrieving this resource.';
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
._loading-spinner {
  position: relative;
}

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

.hover-message-cnt {
  display: none;
  position: absolute;
  top: -5px;
}

._loading-spinner:hover > .hover-message-cnt {
  display: inline-block;
}

.hover-message-triangle {
  width: 0;
  height: 0;
  position: absolute;
  left: -7px;
  top: 0;
  display: block;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
  border-right: 7px solid #3B342C;
}

.hover-message {
  width: 250px;
  padding: 8px 9px;
  background: #3B342C;

  color: #a7a29c;
  font-size: 14px;
  font-weight: normal;

  box-shadow: 0 0px 6px rgba(0, 0, 0, 0.3);
}

</style>
