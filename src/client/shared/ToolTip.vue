<template>
  <div
    class="_tooltip"
    :style="{
      zIndex: messageVisible ? 1000 : undefined,
      // display: inline ? 'inline' : 'block',
    }"
    @mouseenter="hovering = true"
    @mouseleave="hovering = false"
  >
    <slot />

    <div
      v-if="messageVisible"
      class="zero-size-wrapper"
      :style="zeroSizeWrapperStyle"
    >
      <div class="message-frame" :style="messageFrameStyle">
        <div class="spacer"></div>
        <div class="triangle-container" :style="triangleContainerStyle">
          <div class="triangle" :style="borderTriangleStyle"></div>
          <div class="triangle" :style="fillTriangleStyle"></div>
        </div>
        <div class="message-content">
          <slot name="message" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { CSSProperties, PropType, defineComponent } from "vue";
import { inEnum, coerceToEnum } from "../../shared/util/enum";
import {
  ToolTipGravity,
  ToolTipGravityPrimary,
  ToolTipGravitySecondary,
} from "./ToolTipGravity";

const ARROW_RISE = 7;
const ARROW_BASE = 14;

/**
 * Causes a tooltip to appear around a hosted element when the user hovers over
 * it.
 *
 * Use the #default slot to specify the hosted content. Use the #message slot
 * to specify the contents of the tooltip.
 *
 * The tooltip assumes that the content should be rendered with display: inline.
 * If that isn't correct, simply adjust the display style of the tooltip root.
 */
export default defineComponent({
  props: {
    /**
     * Where the tooltip appears relative to the original object.
     *
     * Format: "<primary>" or "<primary> <secondary>"
     * Examples: "top", "left center", "bottom start"
     *
     * Primary options: "left", "top", "right", "bottom"
     * Secondary options: "start", "center", "end"
     *
     * If no secondary is specified, defaults to "center". If nothing is
     * specified, defaults to "bottom center".
     */
    gravity: {
      type: String as PropType<ToolTipGravity>,
      required: false,
      default: "bottom",
      validator: (value: string) => {
        const [primary, secondary] = splitGravString(value);

        if (!inEnum(primary, ToolTipGravityPrimary)) {
          return false;
        }
        if (secondary != null && !inEnum(secondary, ToolTipGravitySecondary)) {
          return false;
        }
        return true;
      },
    },

    showMessage: {
      type: Boolean,
      required: false,
      default: true,
    },

    devForceOpen: {
      type: Boolean,
      required: false,
      default: false,
    },
  },

  data() {
    return {
      hovering: false,
    } as {
      hovering: boolean;
    };
  },

  computed: {
    parsedGravity(): [ToolTipGravityPrimary, ToolTipGravitySecondary] {
      const [rawPrimary, rawSecondary] = splitGravString(this.gravity);

      return [
        coerceToEnum(
          rawPrimary,
          ToolTipGravityPrimary,
          ToolTipGravityPrimary.BOTTOM,
        ),
        coerceToEnum(
          rawSecondary,
          ToolTipGravitySecondary,
          ToolTipGravitySecondary.CENTER,
        ),
      ];
    },

    primaryGravity(): ToolTipGravityPrimary {
      return this.parsedGravity[0];
    },

    secondaryGravity(): ToolTipGravitySecondary {
      return this.parsedGravity[1];
    },

    messageVisible() {
      return (this.showMessage && this.hovering) || this.devForceOpen;
    },

    zeroSizeWrapperStyle() {
      let style = {} as CSSProperties;

      style.flexDirection = computePrimaryFlexDirection(this.primaryGravity);
      style.alignItems = this.secondaryGravity;

      switch (this.primaryGravity) {
        case "left":
          style.left = "0";
          style.top = computeSecondaryPercentage(this.secondaryGravity);
          break;
        case "top":
          style.top = "0";
          style.left = computeSecondaryPercentage(this.secondaryGravity);
          break;
        case "right":
          style.right = "0";
          style.top = computeSecondaryPercentage(this.secondaryGravity);
          break;
        case "bottom":
          style.bottom = "0";
          style.left = computeSecondaryPercentage(this.secondaryGravity);
          break;
      }

      return style;
    },

    messageFrameStyle() {
      let style = {} as CSSProperties;

      style.flexDirection = computePrimaryFlexDirection(this.primaryGravity);
      style.alignItems = this.secondaryGravity;

      return style;
    },

    triangleContainerStyle() {
      let style = {} as CSSProperties;
      const riseDimen = ARROW_RISE + "px";
      const baseDimen = ARROW_BASE + "px";
      const margin = "5px";

      switch (this.primaryGravity) {
        case ToolTipGravityPrimary.LEFT:
        case ToolTipGravityPrimary.RIGHT:
          style.width = riseDimen;
          style.height = baseDimen;
          style.marginTop = margin;
          style.marginBottom = margin;
          break;
        case ToolTipGravityPrimary.TOP:
        case ToolTipGravityPrimary.BOTTOM:
          style.width = baseDimen;
          style.height = riseDimen;
          style.marginLeft = margin;
          style.marginRight = margin;
          break;
      }

      return style;
    },

    fillTriangleStyle() {
      return triangleStyle(this.primaryGravity, 0x202020, "inset");
    },

    borderTriangleStyle() {
      return triangleStyle(this.primaryGravity, 0x3e3e3e, "none");
    },
  },
});

function splitGravString(str: string): string[] {
  return str.trim().split(/\s+/);
}

function computePrimaryFlexDirection(alignment: ToolTipGravityPrimary) {
  switch (alignment) {
    case ToolTipGravityPrimary.LEFT:
      return "row-reverse";
    case ToolTipGravityPrimary.TOP:
      return "column-reverse";
    case ToolTipGravityPrimary.RIGHT:
      return "row";
    case ToolTipGravityPrimary.BOTTOM:
      return "column";
  }
}

function computeSecondaryPercentage(alignment: ToolTipGravitySecondary) {
  switch (alignment) {
    case ToolTipGravitySecondary.START:
      return "0";
    case ToolTipGravitySecondary.CENTER:
      return "50%";
    case ToolTipGravitySecondary.END:
      return "100%";
  }
}

function triangleStyle(
  gravity: ToolTipGravityPrimary,
  color: number,
  offset: "none" | "inset",
) {
  let style = {} as CSSProperties;
  const opaqueBorder = `${ARROW_RISE}px solid #${color.toString(16)}`;
  const transparentBorder = `${ARROW_BASE / 2}px solid transparent`;

  switch (gravity) {
    case ToolTipGravityPrimary.LEFT:
    case ToolTipGravityPrimary.RIGHT:
      style.borderTop = transparentBorder;
      style.borderBottom = transparentBorder;
      break;
    case ToolTipGravityPrimary.TOP:
    case ToolTipGravityPrimary.BOTTOM:
      style.borderLeft = transparentBorder;
      style.borderRight = transparentBorder;
      break;
  }

  switch (gravity) {
    case ToolTipGravityPrimary.LEFT:
      style.borderLeft = opaqueBorder;
      break;
    case ToolTipGravityPrimary.RIGHT:
      style.borderRight = opaqueBorder;
      break;
    case ToolTipGravityPrimary.TOP:
      style.borderTop = opaqueBorder;
      break;
    case ToolTipGravityPrimary.BOTTOM:
      style.borderBottom = opaqueBorder;
      break;
  }

  if (offset == "inset") {
    switch (gravity) {
      case ToolTipGravityPrimary.LEFT:
        style.left = "-1.5px";
        break;
      case ToolTipGravityPrimary.RIGHT:
        style.left = "1.5px";
        break;
      case ToolTipGravityPrimary.TOP:
        style.top = "-1.5px";
        break;
      case ToolTipGravityPrimary.BOTTOM:
        style.top = "1.5px";
        break;
    }
  }

  return style;
}
</script>

<style scoped>
._tooltip {
  position: relative;
  display: inline-block;
}

.zero-size-wrapper {
  position: absolute;
  height: 0;
  width: 0;
  display: flex;
}

.message-frame {
  display: flex;
}

.message-content {
  width: max-content;
  max-width: 300px;

  padding: 10px 11px;
  box-sizing: border-box;
  background: #202020;
  border: 1px solid #3e3e3e;
  position: relative;

  color: #a7a29c;
  font-size: 14px;
  font-weight: normal;
  line-height: 1.25;
  text-align: left;
  white-space: initial;

  box-shadow: 0 0px 10px rgba(0, 0, 0, 0.3);
}

.triangle-container {
  position: relative;
  z-index: 1;
}

.triangle {
  position: absolute;
  width: 0;
  height: 0;
  left: 0;
  top: 0;
}

.spacer {
  width: 2px;
  height: 2px;
}
</style>
