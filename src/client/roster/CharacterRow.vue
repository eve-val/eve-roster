<template>
  <div class="_character-row">
    <div class="horiz-aligner">
      <div class="alert col" :style="cellStyle(0)">
        <tool-tip v-if="alertMessage != null" gravity="right" :inline="false">
          <template #default>
            <img class="alert-icon" :src="alertIconSrc" />
          </template>
          <template #message>
            <span>{{ alertMessage }}</span>
          </template>
        </tool-tip>
      </div>

      <div class="name col" :style="cellStyle(1)">
        <router-link
          class="char-link col-text"
          :to="'/character/' + character.id"
        >
          <template v-if="filterMatch">
            {{ filterMatch[0]
            }}<span class="highlight">{{ filterMatch[1] }}</span
            >{{ filterMatch[2] }}
          </template>
          <template v-else>
            {{ displayVals[1] }}
          </template>
        </router-link>
        <tool-tip v-if="!inPrimaryCorp" gravity="right" :inline="true">
          <template #default>
            <eve-image
              :id="character.corporationId"
              :type="'Corporation'"
              :size="26"
              class="corp-icon"
            />
          </template>
          <template #message>
            <span>{{ character.corporationName }}</span>
          </template>
        </tool-tip>
      </div>

      <div
        class="alts col"
        :style="cellStyle(2)"
        @mousedown="$emit('toggle-expanded')"
      >
        {{ displayVals[2] }}
      </div>

      <div
        v-for="(dv, i) in subsequentDisplayVals"
        :key="i + 3"
        class="col"
        :style="cellStyle(i + 3)"
      >
        <template v-if="!tooltipMessage(i + 3)">
          <span class="col-text">{{ dashDefault(dv) }}</span>
        </template>
        <tool-tip v-else gravity="right" :inline="true">
          <template #default>
            <span
              class="col-text"
              :style="{ 'text-align': cellAlignment(i + 3) }"
            >
              {{ dashDefault(dv) }}
            </span>
          </template>
          <template #message>
            <span>{{ tooltipMessage(i + 3) }}</span>
          </template>
        </tool-tip>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import eveConstants from "../shared/eveConstants";
import filter from "./filter";
import { formatNumber } from "../shared/numberFormat";
import { CssStyleObject } from "../shared/types";

import EveImage from "../shared/EveImage.vue";
import ToolTip from "../shared/ToolTip.vue";

import infoIcon from "../shared-res/circle-info.svg";
import warningIcon from "../shared-res/triangle-warning.svg";
import errorIcon from "../shared-res/triangle-error.svg";

import { AccountColumn, CharacterColumn, Column } from "./rosterColumns";
import { Account, Character } from "./types";

// Indices must match levels in src/shared/rosterAlertLevels.js
const MSG_ICONS = [null, infoIcon, warningIcon, errorIcon] as const;

type Value = string | number | boolean | null | undefined;

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    EveImage,
    ToolTip,
  },

  props: {
    character: { type: Object as PropType<Character>, required: true },
    columns: { type: Array as PropType<readonly Column[]>, required: true },
    isMain: { type: Boolean, required: true },
    account: {
      type: Object as PropType<Account>,
      required: false,
      default: null,
    },
    filter: { type: String, required: false, default: "" },
  },

  emits: ["toggle-expanded"],

  computed: {
    displayVals: function (): Value[] {
      let labels: Value[] = [];
      for (let col of this.columns) {
        labels.push(this.displayVal(col));
      }
      return labels;
    },

    subsequentDisplayVals: function (): Value[] {
      let labels: Value[] = [];
      this.columns.forEach((col, i) => {
        if (i >= 3) {
          labels.push(this.displayVal(col));
        }
      });
      return labels;
    },

    alertIconSrc: function (): string | null {
      let level = 0;
      if (this.isMain) {
        level = Math.max(
          this.account.alertLevel || 0,
          this.character.alertLevel || 0
        );
      } else {
        level = this.character.alertLevel || 0;
      }

      return MSG_ICONS[level];
    },

    alertMessage: function (): string | null {
      let message;
      if (this.isMain) {
        // Must include any account message
        message = (
          (this.account.alertMessage || "") +
          " " +
          (this.character.alertMessage || "")
        ).trim();
      } else {
        // Just the character message if it exists
        message = (this.character.alertMessage || "").trim();
      }
      return message.length > 0 ? message : null;
    },

    filterMatch: function (): string[] | null {
      let match = filter.match(this.character.name, this.filter);
      return match;
    },

    inPrimaryCorp: function (): boolean {
      return (
        eveConstants.primaryCorporations.indexOf(
          this.character.corporationId
        ) != -1
      );
    },
  },

  methods: {
    cellStyle: function (idx: number): CssStyleObject {
      let col = this.columns[idx];
      let paddingLeft = 0;
      let width = col.width;
      if (col.key == "name" && !this.isMain) {
        paddingLeft = 20;
        width -= paddingLeft;
      }

      return {
        width: width + "px",
        "margin-left": col.margin != undefined ? col.margin + "px" : undefined,
        "text-align": this.cellAlignment(idx),
        "padding-left": paddingLeft ? paddingLeft + "px" : undefined,
        cursor: col.key != "name" ? "default" : undefined,
      };
    },

    tooltipMessage: function (idx: number): Value {
      let col = this.columns[idx];
      if (!col.metaKey) {
        // No tooltip to display
        return null;
      }

      let metaValue = null;
      if (col.account) {
        if (!this.isMain) {
          // In this case the column displays a ditto, so there's not a reason to show a tooltip for that
          return null;
        } else {
          metaValue = this.account[col.metaKey];
        }
      } else {
        metaValue = this.character[col.metaKey];
      }

      if (metaValue) {
        if (
          col.metaKey == "killValueInLastMonth" ||
          col.metaKey == "lossValueInLastMonth"
        ) {
          // Special case to reformat numeric value to a friendly ISK string
          // type checked above.
          metaValue = iskLabel(<number>metaValue);
        }
        return <string | number>metaValue;
      } else {
        // Meta data was not included in the server response
        return null;
      }
    },

    displayVal: function (col: Column): Value {
      switch (col.key) {
        case "alts":
          if (!this.isMain) {
            return "";
          } else {
            return altsLabel(this.account.alts.length);
          }
        case "lastSeen":
          return this.character.lastSeenLabel || "-";
        default:
          if (col.account) {
            if (!this.isMain) {
              return "″"; // ditto symbol
            } else {
              return <Value>this.account[(<AccountColumn>col).key];
            }
          } else {
            return this.character[(<CharacterColumn>col).key];
          }
      }
    },

    dashDefault: function (value: null | string | number): string | number {
      if (value == null) {
        return "-";
      } else {
        return value;
      }
    },

    cellAlignment(colIdx: number): string {
      let col = this.columns[colIdx];
      let align = "left";
      if (col.key == "alertLevel") {
        align = "center";
      } else if (col.numeric) {
        align = "right";
      }
      return align;
    },
  },
});

function iskLabel(isk: number): string {
  return formatNumber(isk) + " ISK";
}

function altsLabel(altsCount: number): string {
  if (altsCount == 0) {
    return "";
  } else if (altsCount == 1) {
    return "1 alt";
  } else {
    return altsCount + " alts";
  }
}
</script>

<style scoped>
._character-row {
  display: flex;
  align-items: center;
  height: 40px;
}

.horiz-aligner {
  display: flex;
  align-items: center;
  padding-right: 30px;
}

.col {
  flex: 0 0 auto;
  color: #a7a29c;
  margin-left: 20px;
  white-space: nowrap;
}

.col-text {
  overflow: hidden;
  text-overflow: ellipsis;
  max-width: 100%;
  display: block;
}

.alert {
  text-align: center;
}

.alert-icon {
  width: 15px;
  height: 15px;
  margin-left: 9px;
}

.name {
  display: flex;
  align-items: center;
}

.char-link {
  position: relative;
  top: -1px;
  color: #cdcdcd;
  text-decoration: none;
}

.char-link:hover {
  text-decoration: underline;
}

.char-link:active {
  color: #fff;
}

.corp-icon {
  margin-left: 9px;
  background: rgba(0, 0, 0, 0.2);
  align-self: center;
}

.alts {
  color: #65594a;
  user-select: none;
  cursor: default;

  transition-property: color;
  transition-duration: 250ms;
  transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
}

.alts:hover {
  color: #a9a29a;
  text-shadow: 0 0 4px rgba(204, 160, 37, 0.72);
}

.highlight {
  background: #1f4e73;
  /*background: #a27429;
  color: #1d1d1d;*/
  /*background: yellow;
  color: black;*/
}
</style>
