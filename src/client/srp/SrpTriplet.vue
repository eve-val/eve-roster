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
        class="icon"
        :id="iconId"
        :type="iconType"
        :size="50"
        style="background-color: #101010"
      >
      </eve-image>
    </adaptive-link>
    <div class="text-cnt">
      <div class="top-line-cnt">
        <adaptive-link
          class="top-line"
          :path="effectiveTopHref"
          :link-class="'link-row'"
        >
          {{ topLine }}</adaptive-link
        >
        <slot name="top-line-extra"></slot>
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

<script>
import AdaptiveLink from "./AdaptiveLink.vue";
import EveImage from "../shared/EveImage.vue";

import { NameCacheMixin } from "../shared/nameCache";

const ABS_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export default {
  components: {
    AdaptiveLink,
    EveImage,
  },

  props: {
    iconId: { type: Number, required: false },
    /** One of the types listed in EveImage (Character, Corporation, etc). */
    iconType: { type: String, required: false },
    topLine: { type: String, required: true },
    bottomLine: { type: String, required: false },
    iconHref: { type: String, required: false },
    topHref: { type: String, required: false },
    botHref: { type: String, required: false },
    /**
     * All entries are linked with the href unless overridden by the above
     * props.
     */
    defaultHref: { type: String, required: false },
  },

  computed: {
    effectiveIconHref() {
      return this.iconHref || this.defaultHref;
    },

    effectiveTopHref() {
      return this.topHref || this.defaultHref;
    },

    effectiveBotHref() {
      return this.botHref || this.defaultHref;
    },
  },

  methods: Object.assign(
    {
      isExternalUrl(url) {
        return ABS_URL_PATTERN.test(url);
      },
    },
    NameCacheMixin
  ),
};
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
