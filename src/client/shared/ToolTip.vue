<template>
  <div
    class="_tooltip"
    :style="{
      display: inline ? 'inline' : 'block',
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

enum PrimaryGravity {
  LEFT = "left",
  TOP = "top",
  RIGHT = "right",
  BOTTOM = "bottom",
}

enum SecondaryGravity {
  START = "start",
  CENTER = "center",
  END = "end",
}

type ToolTipGravity =
  | `${PrimaryGravity}`
  | `${PrimaryGravity} ${SecondaryGravity}`;

const ARROW_RISE = 7;
const ARROW_BASE = 14;

/**
 * Causes a tooltip to appear around a hosted element when the user hovers over
 * it.
 *
 * Use the #default slot to specify the hosted content. Use the #message slot
 * to specify the contents of the tooltip.
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

        if (!valueIsPresentInEnum(primary, PrimaryGravity)) {
          return false;
        }
        if (
          secondary != null &&
          !valueIsPresentInEnum(secondary, SecondaryGravity)
        ) {
          return false;
        }
        return true;
      },
    },

    /**
     * Whether the element that wraps the hosted content should be by disdplayed
     * with inline or block layout. This can also be modified via CSS styling.
     */
    inline: {
      type: Boolean,
      required: false,
      default: false,
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
    parsedGravity(): [PrimaryGravity, SecondaryGravity] {
      const [rawPrimary, rawSecondary] = splitGravString(this.gravity);

      return [
        coerceToEnum(rawPrimary, PrimaryGravity, PrimaryGravity.BOTTOM),
        coerceToEnum(rawSecondary, SecondaryGravity, SecondaryGravity.CENTER),
      ];
    },

    primaryGravity(): PrimaryGravity {
      return this.parsedGravity[0];
    },

    secondaryGravity(): SecondaryGravity {
      return this.parsedGravity[1];
    },

    messageVisible() {
      return this.hovering || this.devForceOpen;
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
        case PrimaryGravity.LEFT:
        case PrimaryGravity.RIGHT:
          style.width = riseDimen;
          style.height = baseDimen;
          style.marginTop = margin;
          style.marginBottom = margin;
          break;
        case PrimaryGravity.TOP:
        case PrimaryGravity.BOTTOM:
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

function computePrimaryFlexDirection(alignment: PrimaryGravity) {
  switch (alignment) {
    case PrimaryGravity.LEFT:
      return "row-reverse";
    case PrimaryGravity.TOP:
      return "column-reverse";
    case PrimaryGravity.RIGHT:
      return "row";
    case PrimaryGravity.BOTTOM:
      return "column";
  }
}

function computeSecondaryPercentage(alignment: SecondaryGravity) {
  switch (alignment) {
    case SecondaryGravity.START:
      return "0";
    case SecondaryGravity.CENTER:
      return "50%";
    case SecondaryGravity.END:
      return "100%";
  }
}

function triangleStyle(
  gravity: PrimaryGravity,
  color: number,
  offset: "none" | "inset"
) {
  let style = {} as CSSProperties;
  const opaqueBorder = `${ARROW_RISE}px solid #${color.toString(16)}`;
  const transparentBorder = `${ARROW_BASE / 2}px solid transparent`;

  switch (gravity) {
    case PrimaryGravity.LEFT:
    case PrimaryGravity.RIGHT:
      style.borderTop = transparentBorder;
      style.borderBottom = transparentBorder;
      break;
    case PrimaryGravity.TOP:
    case PrimaryGravity.BOTTOM:
      style.borderLeft = transparentBorder;
      style.borderRight = transparentBorder;
      break;
  }

  switch (gravity) {
    case PrimaryGravity.LEFT:
      style.borderLeft = opaqueBorder;
      break;
    case PrimaryGravity.RIGHT:
      style.borderRight = opaqueBorder;
      break;
    case PrimaryGravity.TOP:
      style.borderTop = opaqueBorder;
      break;
    case PrimaryGravity.BOTTOM:
      style.borderBottom = opaqueBorder;
      break;
  }

  if (offset == "inset") {
    switch (gravity) {
      case PrimaryGravity.LEFT:
        style.left = "-1.5px";
        break;
      case PrimaryGravity.RIGHT:
        style.left = "1.5px";
        break;
      case PrimaryGravity.TOP:
        style.top = "-1.5px";
        break;
      case PrimaryGravity.BOTTOM:
        style.top = "1.5px";
        break;
    }
  }

  return style;
}

type StringEnum = {
  [key: string]: string;
};

function valueIsPresentInEnum<T extends StringEnum>(
  value: string,
  enumType: T
) {
  return findEnumValue(value, enumType, (foundValue) => foundValue != null);
}

function coerceToEnum<T extends StringEnum>(
  value: string,
  enumType: T,
  defaultVal: T[keyof T]
) {
  return findEnumValue(value, enumType, (foundValue) =>
    foundValue != null ? foundValue : defaultVal
  );
}

function findEnumValue<T extends StringEnum, R>(
  value: string,
  enumType: T,
  processor: (value: T[keyof T] | null) => R
) {
  for (let key in enumType) {
    if (enumType[key] == value) {
      return processor(value as T[keyof T]);
    }
  }
  return processor(null);
}
</script>

<style scoped>
._tooltip {
  position: relative;
  z-index: 1000;
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
