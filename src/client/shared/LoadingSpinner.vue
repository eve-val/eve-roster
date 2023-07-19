<template>
  <div class="_loading-spinner" :style="{ display: derivedDisplay }">
    <template v-if="derivedState != 'hidden'">
      <img
        v-if="derivedState == 'spinning'"
        class="spinner"
        src="./res/LoadingSpinner-spinner.svg"
        :style="{ width: size, height: size }"
      />
      <tool-tip
        v-if="derivedState != 'spinning' && display == 'inline'"
        :gravity="tooltipGravity"
      >
        <template #default>
          <img
            class="inline-style-icon"
            :src="errorIconSrc"
            :style="{ width: size, height: size }"
          />
        </template>
        <template #message>
          <span>{{ derivedMessage }}</span>
        </template>
      </tool-tip>

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

import { defineComponent, PropType } from "vue";
import ToolTip from "./ToolTip.vue";
import { ToolTipGravity } from "./ToolTipGravity";

import { AxiosResponse } from "axios";
import { enumProp, EnumProp } from "./enumProp";

import inlineErrorIcon from "../shared-res/circle-error.svg";
import inlineWarningIcon from "../shared-res/circle-warning.svg";
import blockErrorIcon from "../shared-res/triangle-error.svg";
import blockWarningIcon from "../shared-res/triangle-warning.svg";

import { inEnum } from "../../shared/util/enum";

enum SpinnerDisplay {
  INLINE = "inline",
  BLOCK = "block",
}

type DerivedDisplay = EnumProp<SpinnerDisplay> | "none";

enum SpinnerState {
  HIDDEN = "hidden",
  SPINNING = "spinning",
  ERROR = "error",
  WARNING = "warning",
}

export default defineComponent({
  components: {
    ToolTip,
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
    display: enumProp(SpinnerDisplay, SpinnerDisplay.INLINE),

    /**
     * Any of 'hidden' | 'spinning' | 'error' | 'warning'.
     * In the case of 'error' or 'warning', an appropriate icon is displayed
     * instead of the spinner. This value overrides anything set by a promise.
     */
    state: {
      type: String as PropType<EnumProp<SpinnerState> | null>,
      required: false,
      default: null,
      validator: (value: string) =>
        value == null || inEnum(value, SpinnerState),
    },

    /**
     * Default state for the spinner, before `state` or promises are applied.
     * See `state` for appropriate values. Default: 'spinning'.
     */
    defaultState: enumProp(SpinnerState, SpinnerState.SPINNING),

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
      type: String as PropType<ToolTipGravity>,
      required: false,
      default: "top",
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

  data() {
    return {
      stateFromPromise: null,
      messageFromPromise: null,
    } as {
      stateFromPromise: null | SpinnerState;
      messageFromPromise: null | string;
    };
  },

  computed: {
    derivedDisplay(): DerivedDisplay {
      if (this.derivedState == "hidden") {
        return "none";
      } else {
        return this.display;
      }
    },

    derivedState(): EnumProp<SpinnerState> {
      return this.state || this.stateFromPromise || this.defaultState;
    },

    derivedMessage(): string {
      return this.messageFromPromise || this.adversityMessage;
    },

    errorIconSrc(): string {
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
        default:
          switch (this.derivedState) {
            case "warning":
              return blockWarningIcon;
            case "error":
            default:
              return blockErrorIcon;
          }
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
      this.observe(promise);
    },
  },

  mounted() {
    this.observe(this.promise);
  },

  methods: {
    observe(promise: Promise<any> | null) {
      this.messageFromPromise = null;
      if (promise == null) {
        this.stateFromPromise = null;
        return;
      }
      this.stateFromPromise = SpinnerState.SPINNING;

      promise
        .then(() => {
          this.stateFromPromise = SpinnerState.HIDDEN;
        })
        .catch((e: string | Error | AxiosResponse) => {
          this.stateFromPromise = SpinnerState.ERROR;

          let preface =
            `There was an error while ` +
            `${this.actionLabel || "performing this action"}. `;
          let message;
          if (isString(e)) {
            message = e;
          } else if (hasResponseMessage(e) && e.response.data.message) {
            message = e.response.data.message;
          } else if (hasResponseWarning(e) && e.response.data.warning) {
            message = e.response.data.warning;
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
  e: any,
): e is { response: AxiosResponse<{ message: string }> } {
  return (
    typeof e.response !== "undefined" && typeof e.response?.data === "string"
  );
}
function hasResponseWarning(
  e: any,
): e is { response: AxiosResponse<{ warning: string }> } {
  return (
    typeof e.response !== "undefined" && typeof e.response?.warning === "string"
  );
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
