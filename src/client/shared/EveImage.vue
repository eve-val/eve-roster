<template>
  <img
    :src="portraitSrc"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>

<script lang="ts">
import unknownIcon from "./res/EveImage-Unknown.svg";

import { SUPPORTED_TYPES, AssetType } from "./types";

const SUPPORTED_SIZES = [32, 64, 128, 256, 512] as const;
type AssetSize = (typeof SUPPORTED_SIZES)[number];

import { defineComponent, PropType } from "vue";
export default defineComponent({
  props: {
    id: {
      type: Number,
      required: false,
      default: null,
    },
    type: {
      type: String as PropType<AssetType | null>,
      required: true,
      validator: (value: string) =>
        !value || (<readonly string[]>SUPPORTED_TYPES).includes(value),
    },
    size: {
      type: Number,
      required: true,
    },
  },

  computed: {
    requestSize: function (): AssetSize {
      let requestSize: AssetSize = SUPPORTED_SIZES[0];
      for (let i = 0; i < SUPPORTED_SIZES.length; i++) {
        requestSize = SUPPORTED_SIZES[i];
        if (<number>requestSize >= this.size) {
          break;
        }
      }
      return requestSize;
    },

    portraitSrc: function (): string {
      if (this.id == null || this.type == null) {
        return unknownIcon;
      } else {
        return (
          "//image.eveonline.com/" +
          this.type +
          "/" +
          this.id +
          "_" +
          this.requestSize +
          (this.type == "Character" ? ".jpg" : ".png")
        );
      }
    },
  },
});
</script>

<style scoped>
.image {
  width: 32px;
  height: 32px;
}
</style>
