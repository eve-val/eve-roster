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

<script>
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
 *
 * <pre>
 * {@code
 *   mount() {
 *     this.$refs.spinner.observe(this.getSomeData())
 *     .then(data => {
 *       this.foo = data.foo;
 *       this.bar = data.bar;
 *     });
 *   }
 * }
 * </pre>
 *
 * Notice that we are accessing the spinner via a ref (`this.$refs.spinner`).
 * You will need to specify a ref name in your markup:
 *
 * <pre>
 * {@code
 *   <loading-spinner ref="spinner" />
 * }
 * </pre>
 *
 * Note: Refs are only available during `mount()` and later -- don't try to
 * access them in anything earlier, such as `create()`!
 *
 * If you would like to modify the appearance of a successful Promise (say, by
 * turning it into a warning or error), add an onSuccess handler:
 *
 * <pre>
 * {@code
 *   mount() {
 *     this.$refs.spinner.observe(
 *         this.getSomeData(),
 *         data => {
 *           if (data.warning) {
 *             return { state: 'warning', message: result.warning, };
 *           }
 *         })
 *     .then(data => {
 *       this.foo = data.foo;
 *       this.bar = data.bar;
 *     });
 *   }
 * }
 * </pre>
 *
 * Notice that `data` is passed to both the onSuccess handler and the chained
 * Promise handler. You can move all of your mode into `onSuccess` if you want;
 * up to you.
 */

import contains from "underscore";
import Tooltip from "./Tooltip.vue";

import inlineErrorIcon from "../shared-res/circle-error.svg";
import inlineWarningIcon from "../shared-res/circle-warning.svg";
import blockErrorIcon from "../shared-res/triangle-error.svg";
import blockWarningIcon from "../shared-res/triangle-warning.svg";

const DISPLAY_VALUES = ["inline", "block"];
const STATE_VALUES = ["hidden", "spinning", "error", "warning"];

export default {
  components: {
    Tooltip,
  },

  props: {
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
      type: String,
      required: false,
      default: "inline",
      validator: (value) => contains(DISPLAY_VALUES, value),
    },

    /**
     * Any of 'hidden' | 'spinning' | 'error' | 'warning'.
     * In the case of 'error' or 'warning', an appropriate icon is displayed
     * instead of the spinner. This value overrides anything set by a promise.
     */
    state: {
      type: String,
      required: false,
      validator: (value) => contains(STATE_VALUES, value),
    },

    /**
     * Default state for the spinner, before `state` or promises are applied.
     * See `state` for appropriate values. Default: 'spinning'.
     */
    defaultState: {
      type: String,
      required: false,
      default: "spinning",
      validator: (value) => contains(STATE_VALUES, value),
    },

    /** Displayed if state is 'error' or 'warning'. */
    adversityMessage: {
      type: String,
      required: false,
    },

    /**
     * The gravity of the hover tooltip. Only applies when state is
     * 'error'/'warning' and `display` is 'inline'.
     */
    tooltipGravity: {
      type: String,
      required: false,
    },

    /**
     * In the case of a rejected promise, used to describe what was being
     * attempted. Displayed in the form
     * "There was an error while <actionLabel>."
     */
    actionLabel: { type: String, required: false },

    /**
     * In the case of a rejected promise, rethrow the error that caused the
     * rejection. This will cause the promise returned by `observe()` to
     * be rejected with the original error. Default: true.
     */
    rethrowError: { type: Boolean, required: false, default: true },
  },

  data: function () {
    return {
      stateFromPromise: null,
      messageFromPromise: null,
    };
  },

  computed: {
    derivedDisplay() {
      if (this.derivedState == "hidden") {
        return "none";
      } else {
        return this.display;
      }
    },

    derivedState() {
      return this.state || this.stateFromPromise || this.defaultState;
    },

    derivedMessage() {
      return this.messageFromPromise || this.adversityMessage;
    },

    errorIconSrc() {
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

  methods: {
    /**
     * If set, the state of the spinner will reflect the promise:
     * - Unresolved: 'spinning'
     * - Resolved: 'hidden'
     * - Rejected: 'error'
     * If the promise is rejected, `adversityMessage` will be the rejecting
     * error's message.
     * This behavior overrides the `defaultState` property but can be
     * overridden by the `state` property.
     *
     * @param onSuccess A method that can be used to adjust the "result" of
     *        the promise. Passed the payload from the promise. Should return
     *        An object of the form `{ state: String, message?: String }`.
     */
    observe(promise, onSuccess) {
      this.messageFromPromise = null;
      if (promise == null) {
        this.stateFromPromise = null;
        return;
      }
      this.stateFromPromise = "spinning";

      return promise
        .then((payload) => {
          let newState = "hidden";

          this.stateFromPromise = "hidden";

          let result = onSuccess && onSuccess(payload);
          if (result) {
            if (contains(STATE_VALUES, result.state)) {
              newState = result.state;
            } else if (result.state != null) {
              console.warn("WARNING: Bad spinner state:", result.state);
            }
            if (
              (newState == "error" || newState == "warning") &&
              result.message
            ) {
              this.messageFromPromise = result.message;
            }
          }

          this.stateFromPromise = newState;

          // Pass data payload along to actual consumer.
          return payload;
        })
        .catch((e) => {
          this.stateFromPromise = "error";

          let preface =
            `There was an error while ` +
            `${this.actionLabel || "performing this action"}. `;
          let message;
          if (typeof e == "string") {
            message = e;
          } else if (e.response && e.response.data && e.response.data.message) {
            message = e.response.data.message;
          } else if (e.message) {
            message = e.message;
          } else {
            message = "";
          }
          this.messageFromPromise = preface + message;

          if (this.rethrowError) {
            throw e;
          }
        });
    },
  },
};
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
