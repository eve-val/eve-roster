<template>
  <img :src="portraitSrc" :style="{ width: size + 'px', height: size + 'px' }">
</template>

<script>

const unknownIcon = require('../assets/EveImage-Unknown.svg');

let SUPPORTED_TYPES = {
  Alliance: true,
  Corporation: true,
  Character: true,
  Type: true,
  Render: true,
};

let SUPPORTED_SIZES = [32, 64, 128, 256, 512];

export default {
  props: {
    id: {
      type: Number,
      required: false,
    },
    type: {
      type: String,
      required: true,
      validator: function(value) {
        return SUPPORTED_TYPES[value] != undefined;
      }
    },
    size: {
      type: Number,
      required: true
    }
  },

  computed: {
    requestSize: function() {
      let requestSize;
      for (let i = 0; i < SUPPORTED_SIZES.length; i++) {
        requestSize = SUPPORTED_SIZES[i];
        if (requestSize >= this.size) {
          break;
        }
      }
      return requestSize;
    },

    portraitSrc: function() {
      if (this.id == null) {
        return unknownIcon;
      } else {
        return '//image.eveonline.com/' + this.type + '/' + this.id
            + '_' + this.requestSize
            + (this.type == 'Character' ? '.jpg' : '.png');
      }
    }
  }
}
</script>

<style scoped>
.image {
  width: 32px;
  height: 32px;
}

</style>