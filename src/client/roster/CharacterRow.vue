<template>
<div class="_character-row">
  <div class="horiz-aligner">
    <div class="alert col" :style="cellStyle(0)">
      <tooltip v-if="alertMessage != null" gravity="right" :inline="false">
        <img class="alert-icon" :src="alertIconSrc" />
        <span slot="message">{{ alertMessage }}</span>
      </tooltip>
    </div>

    <div class="name col" :style="cellStyle(1)">
      <router-link
          class="char-link col-text"
          :to="'/character/' + character.id"
          >
        <template v-if="filterMatch">
          {{ filterMatch[0] }}<span class="highlight"
          >{{ filterMatch[1] }}</span>{{ filterMatch[2] }}
        </template>
        <template v-else>{{ displayVals[1] }}</template>
      </router-link>
      <tooltip v-if="!inPrimaryCorp" gravity="right" :inline="true">
        <eve-image :id="character.corporationId"
                   :type="'Corporation'"
                   :size="26"
                   class="corp-icon"
                   />
        <span slot="message">{{ character.corporationName }}</span>
      </tooltip>
    </div>

    <div class="alts col"
        :style="cellStyle(2)"
        @mousedown="$emit('toggleExpanded')"
        >{{ displayVals[2] }}</div>

    <div class="col" v-for="(displayVal, i) in displayVals"
        :key="i"
        v-if="i >= 3"
        :style="cellStyle(i)"
        >
      <template v-if="!tooltipMessage(i)">
        <span class="col-text">{{ displayVal | dashDefault }}</span>
      </template>
      <tooltip v-else gravity="right" :inline="true">
        <span class="col-text" :style="{ 'text-align': cellAlignment(i) }">
          {{ displayVal | dashDefault }}
        </span>
        <span slot="message">{{ tooltipMessage(i) }}</span>
      </tooltip>
    </div>
  </div>
</div>
</template>

<script>
import eveConstants from '../shared/eveConstants';
import filter from './filter';
import { formatNumber } from '../shared/numberFormat';
import rosterColumns from './rosterColumns';

import EveImage from '../shared/EveImage.vue';
import Tooltip from '../shared/Tooltip.vue';

const infoIcon = require('../shared-res/circle-info.svg');
const warningIcon = require('../shared-res/triangle-warning.svg');
const errorIcon = require('../shared-res/triangle-error.svg');

// Indices must match levels in src/shared/rosterAlertLevels.js
const MSG_ICONS = [ null, infoIcon, warningIcon, errorIcon ];

export default {
  components: {
    EveImage,
    Tooltip
  },

  props: {
    character: { type: Object, required: true },
    columns: { type: Array, required: true },
    isMain: { type: Boolean, required: true },
    account: { type: Object, required: false },
    filter: { type: String, required: false },
  },

  data: function() {
    return {
    };
  },

  computed: {

    displayVals: function() {
      let labels = [];
      for (let col of this.columns) {
        labels.push(this.displayVal(col));
      }
      return labels;
    },

    alertIconSrc: function() {
      let level = 0;
      if (this.isMain) {
        level = Math.max(this.account.alertLevel || 0,
            this.character.alertLevel || 0);
      } else {
        level = this.character.alertLevel || 0;
      }

      return MSG_ICONS[level];
    },

    alertMessage: function() {
      let message;
      if (this.isMain) {
        // Must include any account message
        message = ((this.account.alertMessage || '') + ' '
            + (this.character.alertMessage || '')).trim();
      } else {
        // Just the character message if it exists
        message = (this.character.alertMessage || '').trim();
      }
      return message.length > 0 ? message : null;
    },

    filterMatch: function() {
      let match = filter.match(this.character.name, this.filter);
      return match;
    },

    inPrimaryCorp: function() {
      return eveConstants
          .primaryCorporations.indexOf(this.character.corporationId) != -1;
    },

  },

  filters: {
    dashDefault: function(value) {
      if (value == null) {
        return '-';
      } else {
        return value;
      }
    }
  },

  methods: {
    cellStyle: function(idx) {
      let col = this.columns[idx];
      let paddingLeft = 0;
      let width = col.width;
      if (col.key == 'name' && !this.isMain) {
        paddingLeft = 20;
        width -= paddingLeft;
      }

      return {
        width: width + 'px',
        'margin-left': col.margin != undefined ? col.margin + 'px' : undefined,
        'text-align': this.cellAlignment(idx),
        'padding-left': paddingLeft ? paddingLeft + 'px' : undefined,
        'cursor': col.key != 'name' ? 'default' : undefined,
      };
    },

    tooltipMessage: function(idx) {
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
        if (col.metaKey == 'killValueInLastMonth' || col.metaKey == 'lossValueInLastMonth') {
          // Special case to reformat numeric value to a friendly ISK string
          metaValue = iskLabel(metaValue);
        }

        return metaValue;
      } else {
        // Meta data was not included in the server response
        return null;
      }
    },

    displayVal: function(col) {
      switch (col.key) {
        case 'alts':
          if (!this.isMain) {
            return '';
          } else {
            return altsLabel(this.account.alts.length);
          }
          break;
        case 'lastSeen':
          return this.character.lastSeenLabel || '-';
        default:
          if (col.account) {
            if (!this.isMain) {
              return '″'; // ditto symbol
            } else {
              return this.account[col.key];
            }
          } else {
            return this.character[col.key];
          }
      }
    },

    cellAlignment(colIdx) {
      let col = this.columns[colIdx];
      let align = 'left';
      if (col.key == 'warning') {
        align = 'center';
      } else if (col.numeric) {
        align = 'right';
      }
      return align;
    },
  },
}

function iskLabel(isk) {
  return formatNumber(isk) + ' ISK';
}

function altsLabel(altsCount) {
  if (altsCount == 0) {
    return '';
  } else if (altsCount == 1) {
    return '1 alt';
  } else {
    return altsCount + ' alts';
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
  color: #A7A29C;
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
  color: #CDCDCD;
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
  color: #65594A;
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
