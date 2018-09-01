<!--

Displays and allows editing of an SrpLossJson status

Can be in either "editing" or "display" modes. User enters "editing" mode and
triage options weren't initially provided, fetches them from the server.

-->

<template>
<div class="_srp-status">
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
        <div class="rendered-by">
          by
	  <div v-if="srp.renderingCharacter == null" class="rend-null-cnt">
            <router-link
                :to="`/character/${srp.renderingCharacter}`"
                class="row-link"
                >
              {{ name(srp.renderingCharacter) }}
            </router-link>
	  </div>
          <template v-else>
	    Triage Bot
	  </template>
        </div>
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

import LoadingSpinner from '../shared/LoadingSpinner.vue';

import ajaxer from '../shared/ajaxer';
import { NameCacheMixin } from '../shared/nameCache';


export default Vue.extend({
  components: {
    LoadingSpinner,
  },

  props: {
    srp: { type: Object, required: true },
    hasEditPriv: { type: Boolean, required: true },
    startInEditMode: { type: Boolean, required: true },
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
            if (_.findWhere(UNSETTABLE_STATUSES, { reason: this.srp.reason })) {
              this.selectedVerdictKey = response.data.triage.suggestedOption;
            } else {
              // Otherwise it's ineligible; just use that as the key
              this.selectedVerdictKey = `${this.srp.status}_${this.srp.reason}`;
            }
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

const UNSETTABLE_STATUSES = [
  {
      status: 'ineligible',
      reason: 'outside_jurisdiction',
      label: 'Ineligible (outside jurisdiction)',
    },
    {
      status: 'ineligible',
      reason: 'no_recipient',
      label: 'Ineligible (no recipient)',
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
].concat(INELIGIBLE_STATUSES, UNSETTABLE_STATUSES);

function isValidInputPayout(inputPayout) {
  return typeof inputPayout == 'number' && inputPayout >= 0;
}
</script>

<style scoped>
._srp-status {
  display: flex;
  align-items: center;
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

._srp-status:hover .edit-link {
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
