<template>
<div class="_character-row">
  <div class="horiz-aligner">
    <div class="warning col" :style="cellStyle(0)">
      <img
          v-if="warningMessage != null"
          class="warning-icon"
          src="../assets/warning-icon.png"
          :title="warningMessage"
          >
    </div>
    <div class="name col" :style="cellStyle(1)">
      <router-link
          class="char-link"
          :to="'/character/' + character.id"
          >
        <template v-if="filterMatch">
          {{ filterMatch[0] }}<span class="highlight"
          >{{ filterMatch[1] }}</span>{{ filterMatch[2] }}
        </template>
        <template v-else>{{ displayVals[1] }}</template>
      </router-link>
      <eve-image v-if="!inPrimaryCorp"
          :id="character.corporationId"
          :type="'Corporation'"
          :size="26"
          class="corp-icon"
          />
    </div>

    <div class="alts col"
        :style="cellStyle(2)"
        @mousedown="$emit('toggleExpanded')"
        >{{ displayVals[2] }}</div>

    <div class="col" v-for="(displayVal, i) in displayVals"
        v-if="i >= 3"
        :style="cellStyle(i)"
        >
      {{ displayVal | dashDefault }}
    </div>
  </div>
</div>
</template>

<script>
import moment from 'moment';

import eveConstants from '../shared/eveConstants';
import filter from './filter';
import rosterColumns from './rosterColumns';

import EveImage from '../shared/EveImage.vue';

export default {
  components: {
    EveImage,
  },

  props: {
    character: { type: Object, required: true },
    isMain: { type: Boolean, required: true },
    account: { type: Object, required: false },
    filter: { type: String, required: false },
  },

  data: function() {
    return {
      cols: rosterColumns,
    };
  },

  computed: {

    displayVals: function() {
      let labels = [];
      for (let col of rosterColumns) {
        labels.push(this.displayVal(col));
      }
      return labels;
    },

    warningMessage: function() {
      if (this.account != null && !this.account.isOwned) {
        return 'This character has not been claimed.';
      } else {
        return null;
      }
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
      let col = rosterColumns[idx];
      let paddingLeft = 0;
      let width = col.width;
      if (col.key == 'name' && !this.isMain) {
        paddingLeft = 20;
        width -= paddingLeft;
      }
      let align = 'left';
      if (col.key == 'warning') {
        align = 'center';
      } else if (col.numeric) {
        align = 'right';
      }

      return {
        width: width + 'px',
        'margin-left': col.margin != undefined ? col.margin + 'px' : undefined,
        'text-align': align,
        'padding-left': paddingLeft ? paddingLeft + 'px' : undefined,
      };
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
          if (this.character.lastSeen == null) {
            return '-';
          } else if (this.character.logonDate > this.character.logoffDate) {
            return 'now';
          } else {
            return moment(this.character.lastSeen * 1000).fromNow();
          }
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
  },
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
  align-items: baseline;
  padding-right: 30px;
}

.col {
  flex: 0 0 auto;
  color: #A7A29C;
  margin-left: 20px;
}

.warning {
  text-align: center;
}

.warning-icon {
  width: 15px;
  height: 13px;
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
