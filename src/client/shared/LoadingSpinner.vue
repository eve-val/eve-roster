<template>
  <div class="_loading-spinner" :style="{ display: derivedDisplay }">
    <template v-if="derivedState != 'hidden'">
      <img
        v-if="derivedState == 'spinning'"
        class="spinner"
        src="./res/LoadingSpinner-spinner.svg"
        :style="{ width: size, height: size }"
      />
      <tooltip
        v-if="derivedState != 'spinning' && display == 'inline'"
        :gravity="tooltipGravity || 'center top'"
        style="vertical-align: text-bottom"
      >
        <template #default>
          <img
            class="inline-style-icon"
            :src="errorIconSrc"
            :style="{ width: size, height: size }"
          />
        </template>
        <template #message>
          <span v-if="derivedMessage">{{ derivedMessage }}</span>
        </template>
      </tooltip>

      <div
        v-if="derivedState != 'spinning' && display == 'block'"
        class="block-style-message"
      >
        <img class="block-style-icon" :src="errorIconSrc" />{{ derivedMessage }}
      </div>
    </template>
  </div>
</template>

<script lang="ts">
/**
 * Generic loading spinner
 *
 * The spinner can be in either manual or automatic modes. In manual mode,
 * simply set the `state` and `adversityMessage` properties to
 * appropriate values.
 *
 * In automatic mode, you must tell the spinner to observe a Promise. The
 * spinner will automatically hide itself when the Promise resolves, or display
 * an error message if the Promise rejects.
 */

import Tooltip from "./Tooltip.vue";

import { AxiosResponse } from "axios";

import inlineErrorIcon from "../shared-res/circle-error.svg";
import inlineWarningIcon from "../shared-res/circle-warning.svg";
import blockErrorIcon from "../shared-res/triangle-error.svg";
import blockWarningIcon from "../shared-res/triangle-warning.svg";

const DISPLAY_VALUES = ["inline", "block", "none"] as const;
type DisplayValue = typeof DISPLAY_VALUES[number];
const STATE_VALUES = ["hidden", "spinning", "error", "warning"] as const;
type StateValue = typeof STATE_VALUES[number];

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    Tooltip,
  },

  props: {
    promise: {
      type: Promise as PropType<Promise<any> | null>,
      required: false,
      default: null,
    },

    /** Any CSS dimension, e.g. '12px'. */
    size: { type: String, required: false, default: "1.1em" },

    /**
     * Any of 'inline' | 'block'. Default: 'inline'.
     * Determines whether the spinner is rendered as an inline or block element.
     * In an error state, uses two different rendering styles:
     * 'inline': Replace spinner with icon. Hover tooltip on icon contains error
     *           message.
     * 'block': Replace spinner with icon and error message.
     */
    display: {
      type: String as PropType<DisplayValue>,
      required: false,
      default: "inline",
      validator: (value: string) =>
        (<readonly string[]>DISPLAY_VALUES).includes(value),
    },

    /**
     * Any of 'hidden' | 'spinning' | 'error' | 'warning'.
     * In the case of 'error' or 'warning', an appropriate icon is displayed
     * instead of the spinner. This value overrides anything set by a promise.
     */
    state: {
      type: String as PropType<StateValue | null>,
      required: false,
      default: null,
      validator: (value: string) =>
        (<readonly string[]>STATE_VALUES).includes(value),
    },

    /**
     * Default state for the spinner, before `state` or promises are applied.
     * See `state` for appropriate values. Default: 'spinning'.
     */
    defaultState: {
      type: String as PropType<StateValue>,
      required: false,
      default: "spinning",
      validator: (value: string) =>
        (<readonly string[]>STATE_VALUES).includes(value),
    },

    /** Displayed if state is 'error' or 'warning'. */
    adversityMessage: {
      type: String,
      required: false,
      default: "",
    },

    /**
     * The gravity of the hover tooltip. Only applies when state is
     * 'error'/'warning' and `display` is 'inline'.
     */
    tooltipGravity: {
      type: String,
      required: false,
      default: "right",
    },

    /**
     * In the case of a rejected promise, used to describe what was being
     * attempted. Displayed in the form
     * "There was an error while <actionLabel>."
     */
    actionLabel: {
      type: String,
      required: false,
      default: "",
    },
  },

  data: function () {
    return {
      stateFromPromise: null,
      messageFromPromise: null,
    } as {
      stateFromPromise: null | StateValue;
      messageFromPromise: null | string;
    };
  },

  computed: {
    derivedDisplay(): DisplayValue {
      if (this.derivedState == "hidden") {
        return "none";
      } else {
        return this.display;
      }
    },

    derivedState(): StateValue {
      return this.state || this.stateFromPromise || this.defaultState;
    },

    derivedMessage(): string {
      return this.messageFromPromise || this.adversityMessage;
    },

    errorIconSrc(): string | null {
      switch (this.display) {
        case "inline":
          switch (this.derivedState) {
            case "warning":
              return inlineWarningIcon;
            case "error":
            default:
              return inlineErrorIcon;
          }
        case "block":
          switch (this.derivedState) {
            case "warning":
              return blockWarningIcon;
            case "error":
            default:
              return blockErrorIcon;
          }
        default:
          return null;
      }
    },
  },

  watch: {
    /**
     * If set, the state of the spinner will reflect the promise:
     * - Unresolved: 'spinning'
     * - Resolved: 'hidden'
     * - Rejected: 'error'
     * If the promise is rejected, `adversityMessage` will be the rejecting
     * error's message.
     * This behavior overrides the `defaultState` property but can be
     * overridden by the `state` property.
     */
    promise(promise) {
      this.messageFromPromise = null;
      if (promise == null) {
        this.stateFromPromise = null;
        return;
      }
      this.stateFromPromise = "spinning";

      promise
        .then(() => {
          this.stateFromPromise = "hidden";
        })
        .catch((e: string | Error | AxiosResponse) => {
          this.stateFromPromise = "error";

          let preface =
            `There was an error while ` +
            `${this.actionLabel || "performing this action"}. `;
          let message;
          if (isString(e)) {
            message = e;
          } else if (hasResponseMessage(e) && e.response.data.message) {
            message = e.response.data.message;
          } else if (isError(e) && e.message) {
            message = e.message;
          } else {
            message = "";
          }
          this.messageFromPromise = preface + message;
        });
    },
  },
});

function isString(e: any): e is string {
  return typeof e === "string";
}
function isError(e: any): e is Error {
  return typeof e.message === "string";
}
function hasResponseMessage(
  e: any
): e is { response: AxiosResponse<{ message: string }> } {
  return typeof e.response !== undefined && typeof e.response.data === "string";
}
</script>

<style scoped>
.spinner {
  vertical-align: text-bottom;
}

.block-style-icon {
  width: 15px;
  height: 15px;
  margin-right: 5px;
  position: relative;
  top: 1px;
}

.block-style-message {
  display: inline-block;
  padding: 8px 9px;
  font-size: 14px;
  color: #cdcdcd;
  background: #3b342c;
  border-radius: 2px;
}
</style>
