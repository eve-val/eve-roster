<!--

Displays a compact "triplet" of information: an eve icon on the left, with two
lines of text on the right. The text may be optionally wrapped in links.

-->

<template>
  <div class="_srp-triplet">
    <adaptive-link
      v-if="iconId != undefined && iconType != undefined"
      class="icon-cnt"
      :path="effectiveIconHref"
      style="display: inline-block"
    >
      <eve-image
        :id="iconId"
        class="icon"
        :type="iconType"
        :size="50"
        style="background-color: #101010"
      />
    </adaptive-link>
    <div class="text-cnt">
      <div class="top-line-cnt">
        <adaptive-link
          class="top-line"
          :path="effectiveTopHref"
          :link-class="'link-row'"
        >
          {{ topLine }}
        </adaptive-link>
        <slot name="top-line-extra" />
      </div>
      <adaptive-link
        class="bot-line"
        :path="effectiveBotHref"
        :link-class="'link-row'"
      >
        {{ bottomLine || "" }}
      </adaptive-link>
    </div>
  </div>
</template>

<script lang="ts">
import AdaptiveLink from "./AdaptiveLink.vue";
import EveImage from "../shared/EveImage.vue";
import { AssetType } from "../shared/types";

import { NameCacheMixin } from "../shared/nameCache";

const ABS_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AdaptiveLink,
    EveImage,
  },

  props: {
    iconId: { type: Number, required: false, default: null },
    iconType: {
      type: String as PropType<AssetType | null>,
      required: false,
      default: null,
    },
    topLine: { type: String, required: true },
    bottomLine: { type: String, required: false, default: "" },
    iconHref: { type: String, required: false, default: "" },
    topHref: { type: String, required: false, default: "" },
    botHref: { type: String, required: false, default: "" },
    /**
     * All entries are linked with the href unless overridden by the above
     * props.
     */
    defaultHref: { type: String, required: false, default: "" },
  },

  computed: {
    effectiveIconHref(): string {
      return this.iconHref || this.defaultHref;
    },

    effectiveTopHref(): string {
      return this.topHref || this.defaultHref;
    },

    effectiveBotHref(): string {
      return this.botHref || this.defaultHref;
    },
  },

  methods: Object.assign(
    {
      isExternalUrl(url: string): boolean {
        return ABS_URL_PATTERN.test(url);
      },
    },
    NameCacheMixin
  ),
});
</script>

<style scoped>
._srp-triplet {
  display: flex;
  min-width: 70px;
}

.icon-cnt {
  flex-shrink: 0;
  margin-right: 8px;
}

.icon {
  vertical-align: bottom;
}

.text-cnt {
  display: flex;
  flex: 1 1 0;
  min-width: 0;
  flex-direction: column;
  justify-content: center;
  align-items: stretch;
}

.top-line-cnt,
.bot-line {
  font-size: 14px;
  white-space: nowrap;
  text-overflow: ellipsis;
  overflow: hidden;
}

.top-line {
  color: #cdcdcd;
}

.link-row {
  text-decoration: none;
}

.link-row:hover {
  text-decoration: underline;
}

.bot-line {
  color: #a7a29c;
  margin-top: 4px;
}
</style>
