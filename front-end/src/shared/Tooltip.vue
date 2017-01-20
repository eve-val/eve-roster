<template>
  <div class="_tooltip"
       :style="{ display: packTarget ? 'inline-block' : 'block' }">
    <slot></slot>
    <div class="hover-message-cnt"
         v-if="$slots.message"
         :style="hoverStyle">
      <div class="hover-triangle right"
           v-if="gravity=='right'"
           :style="triangleStyle"></div>
      <div class="hover-message">
        <slot name="message"></slot>
      </div>
      <div class="hover-triangle left"
           v-if="gravity=='left'"
           :style="triangleStyle"></div>
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

  // Both of these do a pretty decent job of resizing during a hotswap in dev
  // mode but sporadically it seems they aren't called and the tooltip uses an
  // incorrect size. Haven't been able to reproduce these conditions
  updated: function() {
    this.updateSizing();
  },

  mounted: function() {
    this.updateSizing();
  },

  computed: {
    hoverStyle() {
      let offset = (this.width + 10) + 'px';

      switch (this.gravity) {
        case 'left':
          return {
            right: offset,
            'text-align': 'right'
          };
        case 'right':
          return {
            left: offset,
            'text-align': 'left'
          };
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
._tooltip {
  position: relative;
}

.hover-message-cnt {
  display: none;
  position: absolute;
  top: -7px;
  z-index: 99;
  max-width: 250px;
}

._tooltip:hover > .hover-message-cnt {
  display: block;
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
  display: block;
  padding: 7px 8px;
  background: #202020;
  border: 1px solid #3e3e3e;

  color: #a7a29c;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.25;
  text-align: left;

  box-shadow: 0 0px 10px rgba(0, 0, 0, 0.3);
}
</style>