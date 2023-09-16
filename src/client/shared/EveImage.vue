<template>
  <img
    :src="portraitSrc"
    :style="{ width: size + 'px', height: size + 'px' }"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { SUPPORTED_TYPES, AssetType } from "./types";

import unknownIcon from "./res/EveImage-Unknown.svg";

const SUPPORTED_SIZES = [32, 64, 128, 256, 512] as const;
type AssetSize = (typeof SUPPORTED_SIZES)[number];

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
        !value || (SUPPORTED_TYPES as readonly string[]).includes(value),
    },
    size: {
      type: Number,
      required: true,
    },
  },

  computed: {
    requestSize: function (): AssetSize {
      let requestSize: AssetSize = SUPPORTED_SIZES[0];
      for (const size of SUPPORTED_SIZES) {
        requestSize = size;
        if ((requestSize as number) >= this.size) {
          break;
        }
      }
      return requestSize;
    },

    portraitSrc: function (): string {
      if (this.id == null || this.type == null) {
        return unknownIcon;
      } else {
        const urlType = getUrlType(this.type);
        return (
          "//image.eveonline.com/" +
          urlType +
          "/" +
          this.id +
          "_" +
          this.requestSize +
          (urlType == "Character" ? ".jpg" : ".png")
        );
      }
    },
  },
});

function getUrlType(type: AssetType) {
  switch (type) {
    case "alliance":
      return "Alliance";
    case "corporation":
      return "Corporation";
    case "character":
      return "Character";
    case "type":
      return "Type";
    case "render":
      return "Render";
    default:
      return type;
  }
}
</script>

<style scoped>
.image {
  width: 32px;
  height: 32px;
}
</style>
