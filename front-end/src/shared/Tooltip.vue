<template>
    <div class="anchor" :style="anchorStyle">
        <slot></slot>
        <div class="hover-message-cnt"
             v-if="message != null"
             :style="hoverStyle"
        >
            <div class="hover-triangle right"
                 v-if="gravity=='right'"
                 :style="triangleStyle"
            ></div>
            <div class="hover-message"
                 :style="messageStyle">
                {{ message }}
            </div>
            <div class="hover-triangle left"
                 v-if="gravity=='left'"
                 :style="triangleStyle"
            ></div>
        </div>
    </div>
</template>

<script>

export default {
  props: {
    gravity: {
      type: String,
      required: false,
      default: 'right',
      validator: function(value) {
        return value == 'left' || value == 'right';
      },
    },
    // A null message disables tooltipping, which can make conditional tooltips easier to layout in parent components
    message: {
      type: String,
      required: false,
      default: null
    },
    packTarget: {
      type: Boolean,
      required: false,
      default: true
    }
  },

  data: function() {
    return {
      width: 0,
      height: 0
    }
  },

  // Both of these do a pretty decent job of resizing during a hotswap in dev mode but sporadically it seems
  // they aren't called and the tooltip uses an incorrect size. Haven't been able to reproduce these conditions
  updated: function() {
    this.updateSizing();
  },
  mounted: function() {
    this.updateSizing();
  },

  computed: {
    anchorStyle() {
      if (this.packTarget) {
        return { display: 'inline-block' };
      } else {
        return { display: 'block' };
      }
    },

    hoverStyle() {
      let offset = (this.width + 10) + 'px';

      switch (this.gravity) {
        case 'left':
          return { right: offset };
        case 'right':
          return { left: offset };
      }
      return {};
    },

    messageStyle() {
      // Since the hover-message-cnt uses a fixed size, shift the packed, actual message to the
      // proper end of the container so it lines up with the arrow.
      switch(this.gravity) {
        case 'left':
          return { float: 'right' };
        case 'right':
          return { float: 'left' };
      }
      return {};
    },

    triangleStyle() {
      return {
        top: (this.height / 2 - 7 + 9) + 'px'
      };
    },
  },

  methods: {
    updateSizing() {
      if (!this.$el) {
        return;
      }

      let newWidth = this.$el.offsetWidth;
      let newHeight = this.$el.offsetHeight;

      if (newWidth != this.width) {
        this.width = newWidth;
      }
      if (newHeight != this.height) {
        this.height = newHeight;
      }
    }
  }
}
</script>

<style scoped>
.anchor {
  position: relative;
}

.hover-message-cnt {
  display: none;
  position: absolute;
  clear: both;
  top: -7px;
  text-align: left;
  z-index: 99;
  width: 250px;
}

.anchor:hover > .hover-message-cnt {
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

.hover-triangle.left {
  right: -7px;
  border-left: 7px solid #3e3e3e;
}

.hover-triangle.right {
  left: -7px;
  border-right: 7px solid #3e3e3e;
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
  display: inline-block;
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