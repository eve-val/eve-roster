<!--

Represents a row in a table of SRP-able losses. Displays information about
the loss (ship, victim, attacker) as well as the loss's SRP status (SRP verdict,
awarded payout).

This component has an 'edit mode' that allows the user to set the SRP status
and payout. It can start in edit mode (used during the SRP approval flow) or
the user can manually enter edit mode if they have sufficient privileges (used
in most other places).

-->

<template>
<div
    class="_loss-row"
    :style="{ backgroundColor: highlightAsRelated ? '#171717' : undefined }"
    >
  <srp-triplet
      class="shiplet"
      :icon-id="srp.shipType"
      :icon-type="'Type'"
      :top-line="name(srp.shipType)"
      :bottom-line="srp.timestamp"
      :default-href="zkillHref(srp.killmail, 'kill')"
      >
    <a
        class="related-link"
        v-if="srp.relatedKillmail != null"
        slot="top-line-extra"
        :href="zkillHref(srp.relatedKillmail.id, 'kill')"
        >
      <eve-image
          :id="srp.relatedKillmail.shipId"
          type="Type"
          :size="13"
          @mouseenter.native="onRelatedHover"
          @mouseleave.native="onRelatedUnhover"
          >
      </eve-image>
    </a>
  </srp-triplet>

  <srp-triplet
      class="victimlet"
      :icon-id="this.srp.victim || srp.victimCorp"
      :icon-type="victimIconType"
      :top-line="name(this.srp.victim || srp.victimCorp)"
      :bottom-line="name(srp.victimCorp)"
      :default-href="victimHref"
      :bot-href="zkillHref(srp.victimCorp, 'corporation')"
      >
  </srp-triplet>

  <srp-triplet
      class="executionerlet"
      :icon-id="executionerAffiliation"
      :icon-type="executionerIconType"
      :top-line="name(srp.executioner.character || srp.executioner.ship)"
      :bottom-line="name(executionerAffiliation)"
      :default-href="
          zkillHref(executionerAffiliation, executionerAffiliationType)"
      :top-href="zkillHref(srp.executioner.character, 'character')"
      >
  </srp-triplet>

  <srp-status
      class="srp-status"
      :srp="srp"
      :has-edit-priv="hasEditPriv"
      :start-in-edit-mode="startInEditMode"
      >
  </srp-status>
</div>
</template>

<script>
import Vue from 'vue';
import _ from 'underscore';

import EveImage from '../shared/EveImage.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';
import SrpStatus from './SrpStatus.vue';
import SrpTriplet from './SrpTriplet.vue';

import ajaxer from '../shared/ajaxer';
import { NameCacheMixin } from '../shared/nameCache';


export default Vue.extend({
  components: {
    EveImage,
    LoadingSpinner,
    SrpStatus,
    SrpTriplet,
  },

  props: {
    srp: { type: Object, required: true },
    hasEditPriv: { type: Boolean, required: true },
    startInEditMode: { type: Boolean, required: true },
    highlightAsRelated: { type: Boolean, required: false, default: false, },
  },

  mounted() {
    if (this.editing) {
      this.updateInputPayout(this.selectedVerdict.payout);
    }
  },

  computed: {
    victimIconType() {
      if (this.srp.victim != undefined) {
        return 'Character';
      } else {
        return 'Corporation';
      }
    },

    victimHref() {
      if (this.srp.victim != undefined) {
        return `/character/${this.srp.victim}`;
      } else {
        return null;
      }
    },

    executionerIconType() {
      if (this.srp.executioner.alliance) {
        return 'Alliance';
      } else if (this.srp.executioner.corporation) {
        return 'Corporation';
      } else {
        return 'Type';
      }
    },

    executionerAffiliation() {
      return this.srp.executioner.alliance
          || this.srp.executioner.corporation
          || this.srp.executioner.ship;
    },

    executionerAffiliationType() {
      if (this.srp.executioner.alliance) {
        return 'alliance';
      } else if (this.srp.executioner.corporation) {
        return 'corporation';
      } else {
        return 'ship';
      }
    },
  },

  methods: Object.assign({
    onRelatedHover(e) {
      this.$emit('related-hover', this.srp.relatedKillmail.id);
    },

    onRelatedUnhover(e) {
      this.$emit('related-unhover', this.srp.relatedKillmail.id);
    },

    zkillHref(id, type) {
      if (id == undefined) {
        return undefined;
      } else {
        return `https://zkillboard.com/${type}/${id}/`;
      }
    },
  }, NameCacheMixin),
});

</script>

<style scoped>
._loss-row {
  display: flex;
  height: 77px;
  align-items: center;
  border-bottom: 1px solid #2C2C2C;
}

.shiplet, .victimlet, .executionerlet {
  width: 220px;
  margin-right: 8px;
}

.shiplet {
  margin-left: 10px;
}

.related-link {
  margin-left: 4px;
}

</style>
