<template>
  <a
    v-if="href"
    class="_eve-image-link"
    :href="href"
    :title="title"
    :style="{ width: size + 'px', height: size + 'px' }"
    :target="target"
  >
    <img class="wrapped-img" :src="portraitSrc" :title="title" />
  </a>
  <img
    v-else
    :src="portraitSrc"
    :style="{ width: size + 'px', height: size + 'px' }"
    :title="title"
  />
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";
import { SUPPORTED_TYPES, AssetType } from "./types";
import { nil } from "../../shared/util/simpleTypes";

import unknownIcon from "./res/EveImage-Unknown.svg";

const SUPPORTED_SIZES = [32, 64, 128, 256, 512, 1024] as const;
type AssetSize = (typeof SUPPORTED_SIZES)[number];

export default defineComponent({
  props: {
    id: {
      type: Number as PropType<number | nil>,
      required: false,
      default: undefined,
    },
    type: {
      type: String as PropType<AssetType | nil>,
      required: false,
      default: undefined,
      validator: (value: string | nil) =>
        !value || (SUPPORTED_TYPES as readonly string[]).includes(value),
    },
    size: {
      type: Number,
      required: true,
    },
    title: {
      type: String,
      required: false,
      default: undefined,
    },
    href: {
      type: String as PropType<string | nil>,
      required: false,
      default: undefined,
    },
    target: {
      type: String,
      required: false,
      default: "_blank",
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
._eve-image-link {
  display: inline-block;
}

.wrapped-img {
  width: 100%;
  height: 100%;
  vertical-align: bottom;
}
</style>
