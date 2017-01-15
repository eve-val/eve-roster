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
        :style="hoverStyle"
        >
      <div class="hover-triangle right"
          v-if="gravity=='right'"
          :style="triangleStyle"
          ></div>
      <div class="hover-message">
        {{ errorMessage }}
      </div>
      <div class="hover-triangle left"
          v-if="gravity=='left'"
          :style="triangleStyle"
          ></div>
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

    hoverStyle() {
      let style = {};
      switch (this.gravity) {
        case 'left':
          style.right = this.size + 10 + 'px';
          break;
        case 'right':
          style.left = this.size + 10 + 'px';
          break;
      }
      return style;
    },

    triangleStyle() {
      let style = {
        top: this.size / 2 - 7 + 9 + 'px'
      };
      switch (this.gravity) {
        case 'left':
          style.right = '-7px';
          style['border-left'] = '7px solid #3e3e3e';
          break;
        case 'right':
          style.left = '-7px';
          style['border-right'] = '7px solid #3e3e3e';
          break;
      }
      return style;
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
  top: -7px;
}

._loading-spinner:hover > .hover-message-cnt {
  display: inline-block;
}

.hover-triangle {
  width: 0;
  height: 0;
  position: absolute;
  display: block;
  
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}

.hover-triangle {
  width: 0;
  height: 0;
  position: absolute;
  display: block;
  
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}

.hover-triangle::before {
  content: '';
  width: 0;
  height: 0;
  position: absolute;
  display: block;
  border-top: 7px solid transparent;
  border-bottom: 7px solid transparent;
}

.hover-triangle.left::before {
  left: -9px;
  top: -7px;
  border-left: 7px solid #202020;
}

.hover-triangle.right::before {
  right: -9px;
  top: -7px;
  border-right: 7px solid #202020;
}

.hover-message {
  width: 250px;
  padding: 7px 8px;
  background: #202020;
  border: 1px solid #3e3e3e;

  color: #a7a29c;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.25;

  box-shadow: 0 0px 10px rgba(0, 0, 0, 0.3);
}

</style>
