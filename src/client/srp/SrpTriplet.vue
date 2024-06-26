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
import { defineComponent, PropType } from "vue";

import AdaptiveLink from "./AdaptiveLink.vue";
import EveImage from "../shared/EveImage.vue";
import { AssetType } from "../shared/types";

import { NameCacheMixin } from "../shared/nameCache";
import { nil } from "../../shared/util/simpleTypes";

const ABS_URL_PATTERN = /^(?:[a-z]+:)?\/\//i;

export default defineComponent({
  components: {
    AdaptiveLink,
    EveImage,
  },

  mixins: [NameCacheMixin],

  props: {
    iconId: { type: Number, required: false, default: undefined },
    iconType: {
      type: String as PropType<AssetType | nil>,
      required: false,
      default: undefined,
    },
    topLine: { type: String, required: true },
    bottomLine: { type: String, required: false, default: undefined },
    iconHref: { type: String, required: false, default: undefined },
    topHref: { type: String, required: false, default: undefined },
    botHref: { type: String, required: false, default: undefined },
    /**
     * All entries are linked with the href unless overridden by the above
     * props.
     */
    defaultHref: {
      type: String as PropType<string | nil>,
      required: false,
      default: undefined,
    },
  },

  computed: {
    effectiveIconHref(): string | undefined {
      return this.iconHref ?? this.defaultHref ?? undefined;
    },

    effectiveTopHref(): string | undefined {
      return this.topHref ?? this.defaultHref ?? undefined;
    },

    effectiveBotHref(): string | undefined {
      return this.botHref ?? this.defaultHref ?? undefined;
    },
  },

  methods: {
    isExternalUrl(url: string): boolean {
      return ABS_URL_PATTERN.test(url);
    },
  },
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
