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
      :icon-id="srp.victim"
      :icon-type="'Character'"
      :top-line="name(srp.victim)"
      :bottom-line="name(srp.victimCorp)"
      :default-href="`/character/${srp.victim}`"
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

  <div class="status-cnt">
    <select
        v-if="editing"
        class="verdict-select"
        v-model="selectedVerdictKey"
        >
      <option
          v-for="option in verdictOptions"
          :key="option.key"
          :value="option.key"
          >
        {{ option.label }}
      </option>>
    </select>
    <div v-else class="verdict-text">
      <div v-if="srp.status == 'paid'" class="paid-cnt">
        <router-link
            :to="`/srp/payment/${srp.reimbursement}`"
            class="row-link"
            >
          Paid
        </router-link>
        <div class="paid-by">
          by
          <router-link
              :to="`/character/${srp.payingCharacter}`"
              class="row-link"
              >
            {{ name(srp.payingCharacter) }}
          </router-link>
        </div>
      </div>
      <template v-else>
        {{ getStatusLabel(srp) }}
      </template>
    </div>
  </div>

  <div class="payout-cnt">
    <div v-if="editing" class="payout-input-cnt">
      <input
          class="payout-input"
          v-model.number="inputPayout"
          :disabled="!isApprovalSelected"
          >
      <input class="payout-denom" value="M" disabled>
    </div>
    <div v-else class="payout-disp">
      <router-link
            v-if="srp.status == 'approved' || srp.status == 'paid'"
            class="row-link"
            :to="`/srp/payment/${srp.reimbursement}`"
            >
          {{ rawPayoutToDisplayPayout(srp.payout) }}
        <span style="color: #8B8B8B">M</span>
      </router-link>
      <template v-else>&mdash;</template>
    </div>
  </div>

  <div class="save-cnt">
    <a
        v-if="editing"
        class="save-btn"
        :class="{ ignore: !isApprovalSelected }"
        :style="{
          pointerEvents: isSaveButtonEnabled ? 'auto' : 'none',
          opacity: isSaveButtonEnabled ? undefined : '0.5',
        }"
        @click="onSaveClick"
        >
      <span v-if="saveStatus == 'inactive'">
        {{ isApprovalSelected ? 'Approve' : 'Ignore' }}
      </span>
      <loading-spinner
          ref="saveSpinner"
          display="inline"
          size="30px"
          default-state="hidden"
          tooltip-gravity="left center"
          >
      </loading-spinner>
    </a>
    <div v-else-if="editable && srp.status != 'paid'" class="edit-cnt">
      <a
          v-if="fetchTriageStatus != 'active'"
          class="edit-link"
          @click="onEditClick"
          >
        Edit
      </a>
      <loading-spinner
          ref="editSpinner"
          display="inline"
          size="20px"
          default-state="hidden"
          tooltip-gravity="left center"
          >
      </loading-spinner>
    </div>
  </div>
</div>
</template>

<script>
import Vue from 'vue';
import _ from 'underscore';

import EveImage from '../shared/EveImage.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';
import SrpTriplet from './SrpTriplet.vue';

import ajaxer from '../shared/ajaxer';
import { NameCacheMixin } from '../shared/nameCache';


export default Vue.extend({
  components: {
    EveImage,
    LoadingSpinner,
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

  data() {
    return {
      editing: this.hasEditPriv && this.startInEditMode
          && this.srp.status == 'pending',
      selectedVerdictKey:
          this.srp.triage ? this.srp.triage.suggestedOption : 'custom',
      inputPayout: this.rawPayoutToDisplayPayout(this.srp.payout),
      saveStatus: 'inactive',         // inactive | saving | error
      fetchTriageStatus: 'inactive',  // inactive | active | error,
      originalPayout: null,
    }
  },

  computed: {
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

    selectedVerdict() {
      return _.findWhere(this.verdictOptions, { key: this.selectedVerdictKey });
    },

    isApprovalSelected() {
      return this.selectedVerdict.verdict == 'approved';
    },

    isSaveButtonEnabled() {
      return this.saveStatus != 'saving'
          && isValidInputPayout(this.inputPayout)
          && (this.inputPayout > 0
              || this.selectedVerdict.verdict != 'approved');
    },

    verdictOptions() {
      let options = [];
      if (this.srp.triage != null) {
        for (let option of this.srp.triage.extraOptions) {
          options.push({
            key: option.key,
            label: option.label,
            payout: option.payout,
            verdict: option.verdict,
            reason: null,
          });
        }
      }
      if (this.originalPayout != null) {
        options.push({
          key: 'original_payout',
          label: 'Approved',
          payout: this.originalPayout,
          verdict: 'approved',
          reason: null,
        });
      }
      options.push({
        key: 'custom',
        label: 'Custom payout',
        payout: 0,
        verdict: 'approved',
        reason: null,
      });
      for (let iv of INELIGIBLE_STATUSES) {
        options.push({
          key: `${iv.status}_${iv.reason}`,
          label: iv.label,
          payout: 0,
          verdict: iv.status,
          reason: iv.reason,
        });
      }
      return options;
    },

    editable() {
      return this.hasEditPriv && this.status != 'paid';
    },
  },

  methods: Object.assign({
    onRelatedHover(e) {
      this.$emit('related-hover', this.srp.relatedKillmail.id);
    },

    onRelatedUnhover(e) {
      this.$emit('related-unhover', this.srp.relatedKillmail.id);
    },

    onSaveClick(e) {
      const payout = this.displayPayoutToRawPayout(this.inputPayout);
      const verdict = this.selectedVerdict.verdict;
      const reason = this.selectedVerdict.reason;

      this.saveStatus = 'saving';
      this.$refs.saveSpinner.observe(
          ajaxer.putSrpLossVerdict(this.srp.killmail, verdict, reason, payout)
      )
      .then(response => {
        this.saveStatus = 'inactive';
        this.srp.payout = payout;
        this.srp.status = verdict;
        this.srp.reason = reason;
        this.editing = false;
      })
      .catch(e => {
        this.saveStatus = 'error';
      })
    },

    onEditClick(e) {
      if (this.srp.triage == null) {
        if (this.fetchTriageStatus == 'active') {
          return;
        }
        this.fetchTriageStatus = 'active';
        this.$refs.editSpinner.observe(
            ajaxer.getSrpLossTriageOptions(this.srp.killmail))
        .then(response => {
          this.fetchTriageStatus = 'inactive';
          this.srp.triage = response.data.triage;

          if (this.srp.status == 'pending') {
            this.selectedVerdictKey = response.data.triage.suggestedOption;
          } else if (this.srp.status == 'approved') {
            this.originalPayout = this.srp.payout;
            this.selectedVerdictKey = 'original_payout';
          } else {
            // Otherwise it's ineligible; just use that as the key
            this.selectedVerdictKey = `${this.srp.status}_${this.srp.reason}`;
          }

          this.editing = true;
        })
        .catch(e => {
          this.fetchTriageStatus = 'error';
        });
      } else {
        this.editing = true;
      }
    },

    updateInputPayout(value) {
      this.inputPayout = this.rawPayoutToDisplayPayout(value);
    },

    rawPayoutToDisplayPayout(rawPayout) {
      return Math.round(rawPayout / 1000000);
    },

    displayPayoutToRawPayout(displayPayout) {
      return displayPayout * 1000000;
    },

    getStatusLabel(srp) {
      let entry = _.findWhere(ALL_STATUSES, {
        status: srp.status,
        reason: srp.reason,
      });
      return entry && entry.label || 'Unknown status';
    },

    zkillHref(id, type) {
      if (id == undefined) {
        return undefined;
      } else {
        return `https://zkillboard.com/${type}/${id}/`;
      }
    },
  }, NameCacheMixin),

  watch: {
    selectedVerdict(newVerdict) {
      this.updateInputPayout(this.selectedVerdict.payout);
    },
  },
});


const INELIGIBLE_STATUSES = [
    {
      status: 'ineligible',
      reason: 'not_covered',
      label: 'Ineligible (not covered)',
    },
    {
      status: 'ineligible',
      reason: 'invalid_fit',
      label: 'Ineligible (invalid fit)',
    },
    {
      status: 'ineligible',
      reason: 'invalid_engagement',
      label: 'Ineligible (invalid engagement)',
    },
    {
      status: 'ineligible',
      reason: 'npc',
      label: 'Ineligible (NPC)',
    },
    {
      status: 'ineligible',
      reason: 'solo',
      label: 'Ineligible (solo)',
    },
    {
      status: 'ineligible',
      reason: 'opt_out',
      label: 'Ineligible (opt out)',
    },
    {
      status: 'ineligible',
      reason: 'no_longer_a_member',
      label: 'Ineligible (no longer a member)',
    },
    {
      status: 'ineligible',
      reason: 'obsolete',
      label: 'Ineligible (obsolete)',
    },
    {
      status: 'ineligible',
      reason: 'misc',
      label: 'Ineligible (misc)',
    },
];

const ALL_STATUSES = [
    {
      status: 'approved',
      reason: null,
      label: 'Approved',
    },
    {
      status: 'paid',
      reason: null,
      label: 'Paid',
    },
    {
      status: 'pending',
      reason: null,
      label: 'Pending',
    },
].concat(INELIGIBLE_STATUSES);

function isValidInputPayout(inputPayout) {
  return typeof inputPayout == 'number' && inputPayout >= 0;
}
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

.status-cnt {
  width: 220px;
}

.verdict-select {
  width: 100%;
  height: 35px;
  background: #161616;
  border: 1px solid #2D2D2D;
  color: #CDCDCD;
  font-size: 14px;
  font-family: unset;
  border-radius: 0;
  padding-left: 11px;
}

.verdict-select:focus {
  outline: none;
  border-color: #444;
}

.verdict-text {
  font-size: 14px;
  color: #CDCDCD;
  padding-left: 8px;
}

.paid-cnt {
  display: flex;
  flex-direction: column;
}

.paid-by {
  margin-top: 4px;
  color: #A7A29C;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.payout-cnt {
  position: relative;
  width: 74px;
  margin-left: 8px;
}

.payout-input-cnt {
  width: 100%;
  height: 35px;
}

.payout-input {
  width: 100%;
  height: 100%;
  box-sizing: border-box;
  padding-right: 22px;
  background-color: #161616;
  border: 1px solid #2D2D2D;
  text-align: right;
  font-size: 14px;
  color: #CDCDCD;
}

.payout-input:focus {
  outline: none;
  border-color: #777777;
}

.payout-input:disabled {
  opacity: 0.5;
}

.payout-denom {
  position: absolute;
  width: 100%;
  height: 100%;
  top: 0;
  left: 0;
  box-sizing: border-box;
  padding-right: 6px;
  text-align: right;
  font-size: 14px;
  color: #8B8B8B;
  pointer-events: none;
  background: none;
  border: 1px solid transparent;
}

.payout-disp {
  text-align: right;
  font-size: 14px;
  color: #CDCDCD;
  padding-right: 7px;
}

.save-cnt {
  width: 87px;
  margin-left: 11px;
}

.save-btn {
  display: flex;
  box-sizing: border-box;
  align-items: center;
  justify-content: center;
  -webkit-user-select: none;
  -moz-user-select: none;
  user-select: none;
  width: 100%;
  height: 39px;
  font-size: 14px;
  color: #CDCDCD;
  background-color: #064373;
  border: 1px solid #1368AA;
  border-radius: 0;
}

.save-btn:active {
  background-color: #08365A;
  border-color: #13578C;
  color: #A3A3A3;
}

.save-btn.ignore {
  background-color: #6A4633;
  border-color: #916A5F;
}

.save-btn.ignore:active {
  background-color: #363636;
  border-color: #505050;
}

.edit-cnt {
  text-align: center;
  font-size: 14px;
  color: #CDCDCD;
}

.edit-link {
  visibility: hidden;
  color: #8B8B8B;
  text-decoration: none;
  cursor: pointer;
}

._loss-row:hover .edit-link {
  visibility: visible;
}

.edit-link:hover {
  text-decoration: underline;
}

.row-link {
  color: inherit;
  text-decoration: none;
}

.row-link:hover {
  text-decoration: underline;
}

</style>
