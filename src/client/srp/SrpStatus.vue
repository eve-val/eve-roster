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
        v-model="selectedVerdictKey"
        class="verdict-select"
      >
        <option
          v-for="option in verdictOptions"
          :key="option.key"
          :value="option.key"
        >
          {{ option.label }}
        </option>
        >
      </select>
      <div v-else class="verdict-text">
        <router-link v-if="statusLink" class="row-link" :to="statusLink">
          {{ getStatusLabel(srp) }}
        </router-link>
        <div v-else>
          {{ getStatusLabel(srp) }}
        </div>

        <div v-if="renderingName" class="rendered-by">
          by
          <router-link
            v-if="renderingLink"
            class="row-link"
            :to="renderingLink"
          >
            {{ renderingName }}
          </router-link>
          <template v-else>
            {{ renderingName }}
          </template>
        </div>
      </div>
    </div>

    <div class="payout-cnt">
      <div v-if="editing" class="payout-input-cnt">
        <input
          v-model.number="inputPayout"
          class="payout-input"
          :disabled="!isApprovalSelected"
        />
        <input class="payout-denom" value="M" disabled />
      </div>
      <div v-else class="payout-disp">
        <router-link
          v-if="srp.status == 'approved' || srp.status == 'paid'"
          class="row-link"
          :to="`/srp/payment/${srp.reimbursement}`"
        >
          {{ displayPayout }}
          <span style="color: #8b8b8b">M</span>
        </router-link>
        <template v-else> &mdash; </template>
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
          {{ isApprovalSelected ? "Approve" : "Ignore" }}
        </span>
        <loading-spinner
          ref="saveSpinner"
          display="inline"
          size="30px"
          default-state="hidden"
          tooltip-gravity="left center"
        />
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
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from "underscore";

import LoadingSpinner from "../shared/LoadingSpinner.vue";
import { AxiosResponse } from "axios";
import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";

const REQUEST_STATUSES = ["inactive", "active", "error"] as const;
type RequestStatus = typeof REQUEST_STATUSES[number];

import { VerdictOption, Srp, Triage } from "./types";

import { defineComponent, PropType, ref } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  mixins: [NameCacheMixin],

  props: {
    initialSrp: { type: Object as PropType<Srp>, required: true },
    hasEditPriv: { type: Boolean, required: true },
    startInEditMode: { type: Boolean, required: true },
  },

  setup: () => {
    const editSpinner = ref<InstanceType<typeof LoadingSpinner>>();
    const saveSpinner = ref<InstanceType<typeof LoadingSpinner>>();
    return { editSpinner, saveSpinner };
  },

  data() {
    return {
      srp: this.initialSrp,
      editing:
        this.hasEditPriv &&
        this.startInEditMode &&
        this.initialSrp.status == "pending",
      selectedVerdictKey: this.initialSrp.triage
        ? this.initialSrp.triage.suggestedOption
        : "custom",
      // todo: function is inaccessible from data()
      inputPayout: rawPayoutToDisplayPayout(this.initialSrp.payout),
      saveStatus: "inactive",
      fetchTriageStatus: "inactive",
      originalPayout: null,
    } as {
      srp: Srp;
      editing: boolean;
      selectedVerdictKey: string;
      inputPayout: number | null;
      saveStatus: RequestStatus;
      fetchTriageStatus: RequestStatus;
      originalPayout: number | null;
    };
  },

  computed: {
    displayPayout(): number {
      return rawPayoutToDisplayPayout(this.srp.payout);
    },

    selectedVerdict(): VerdictOption | undefined {
      return _.findWhere(this.verdictOptions, { key: this.selectedVerdictKey });
    },

    isApprovalSelected(): boolean {
      const selected = this.selectedVerdict;
      return selected ? selected.verdict == "approved" : false;
    },

    isSaveButtonEnabled(): boolean {
      return (
        this.saveStatus != "active" &&
        isValidInputPayout(this.inputPayout) &&
        !this.isApprovalSelected
      );
    },

    verdictOptions(): VerdictOption[] {
      let options: VerdictOption[] = [];
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
          key: "original_payout",
          label: "Approved",
          payout: this.originalPayout,
          verdict: "approved",
          reason: null,
        });
      }
      options.push({
        key: "custom",
        label: "Custom payout",
        payout: 0,
        verdict: "approved",
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

    editable(): boolean {
      return this.hasEditPriv && this.srp.status != "paid";
    },

    statusLink(): string | null {
      if (this.srp.status == "paid") {
        return `/srp/payment/${this.srp.reimbursement}`;
      } else {
        return null;
      }
    },

    renderingName(): string | null {
      if (this.srp.renderingCharacter != null) {
        return this.name(this.srp.renderingCharacter);
      } else if (this.srp.status != "pending") {
        return "TriageBot";
      } else {
        return null;
      }
    },

    renderingLink(): string | null {
      if (this.srp.status == "paid") {
        return `/character/${this.srp.payingCharacter}`;
      } else if (this.srp.renderingCharacter != null) {
        return `/character/${this.srp.renderingCharacter}`;
      } else {
        return null;
      }
    },
  },

  watch: {
    selectedVerdict(newVerdict: VerdictOption) {
      this.updateInputPayout(newVerdict.payout);
    },
  },

  mounted() {
    if (this.editing) {
      if (this.selectedVerdict) {
        this.updateInputPayout(this.selectedVerdict.payout);
      }
    }
  },

  methods: {
    onSaveClick() {
      if (!this.selectedVerdict) {
        return;
      }
      const payout = displayPayoutToRawPayout(this.inputPayout);
      const verdict = this.selectedVerdict.verdict;
      const reason = this.selectedVerdict.reason;

      this.saveStatus = "active";
      this.saveSpinner.value
        ?.observe(
          ajaxer.putSrpLossVerdict(this.srp.killmail, verdict, reason, payout)
        )
        .then((response: AxiosResponse<{ id: number; name: string }>) => {
          this.saveStatus = "inactive";
          this.srp.payout = payout;
          this.srp.status = verdict;
          this.srp.reason = reason;
          this.editing = false;
          this.srp.renderingCharacter = response.data.id;
          this.addNames({
            [response.data.id]: response.data.name,
          });
        })
        .catch(() => {
          this.saveStatus = "error";
        });
    },

    onEditClick() {
      if (this.srp.triage == null) {
        if (this.fetchTriageStatus == "active") {
          return;
        }
        this.fetchTriageStatus = "active";
        this.editSpinner.value
          ?.observe(ajaxer.getSrpLossTriageOptions(this.srp.killmail))
          .then((response: AxiosResponse<{ triage: Triage }>) => {
            this.fetchTriageStatus = "inactive";
            this.srp.triage = response.data.triage;

            if (this.srp.status == "pending") {
              this.selectedVerdictKey = response.data.triage.suggestedOption;
            } else if (this.srp.status == "approved") {
              this.originalPayout = this.srp.payout;
              this.selectedVerdictKey = "original_payout";
            } else {
              if (
                _.findWhere(UNSETTABLE_STATUSES, { reason: this.srp.reason })
              ) {
                this.selectedVerdictKey = response.data.triage.suggestedOption;
              } else {
                // Otherwise it's ineligible; just use that as the key
                this.selectedVerdictKey = `${this.srp.status}_${this.srp.reason}`;
              }
            }

            this.editing = true;
          })
          .catch(() => {
            this.fetchTriageStatus = "error";
          });
      } else {
        this.editing = true;
      }
    },

    updateInputPayout(value: number) {
      this.inputPayout = rawPayoutToDisplayPayout(value);
    },

    getStatusLabel(srp: Srp): string {
      let entry = _.findWhere(ALL_STATUSES, {
        status: srp.status,
        reason: srp.reason,
      });
      return entry?.label || "Unknown status";
    },
  },
});

function rawPayoutToDisplayPayout(rawPayout: number | null): number {
  if (rawPayout == null) {
    return 0;
  }
  return Math.round(rawPayout / 1000000);
}

function displayPayoutToRawPayout(displayPayout: number | null): number {
  if (displayPayout == null) {
    return 0;
  }
  return displayPayout * 1000000;
}

interface Status {
  status: string;
  reason: string | null;
  label: string;
}

const INELIGIBLE_STATUSES: Status[] = [
  {
    status: "ineligible",
    reason: "not_covered",
    label: "Ineligible (not covered)",
  },
  {
    status: "ineligible",
    reason: "invalid_fit",
    label: "Ineligible (invalid fit)",
  },
  {
    status: "ineligible",
    reason: "invalid_engagement",
    label: "Ineligible (invalid engagement)",
  },
  {
    status: "ineligible",
    reason: "npc",
    label: "Ineligible (NPC)",
  },
  {
    status: "ineligible",
    reason: "solo",
    label: "Ineligible (solo)",
  },
  {
    status: "ineligible",
    reason: "opt_out",
    label: "Ineligible (opt out)",
  },
  {
    status: "ineligible",
    reason: "no_longer_a_member",
    label: "Ineligible (no longer a member)",
  },
  {
    status: "ineligible",
    reason: "obsolete",
    label: "Ineligible (obsolete)",
  },
  {
    status: "ineligible",
    reason: "misc",
    label: "Ineligible (misc)",
  },
  {
    status: "ineligible",
    reason: "corp_provided",
    label: "Ineligible (corp provided ship)",
  },
];

const UNSETTABLE_STATUSES: Status[] = [
  {
    status: "ineligible",
    reason: "outside_jurisdiction",
    label: "Ineligible (outside jurisdiction)",
  },
  {
    status: "ineligible",
    reason: "no_recipient",
    label: "Ineligible (no recipient)",
  },
];

const MAIN_STATUSES: Status[] = [
  {
    status: "approved",
    reason: null,
    label: "Approved",
  },
  {
    status: "paid",
    reason: null,
    label: "Paid",
  },
  {
    status: "pending",
    reason: null,
    label: "Pending",
  },
];

const ALL_STATUSES: Status[] = MAIN_STATUSES.concat(
  INELIGIBLE_STATUSES,
  UNSETTABLE_STATUSES
);

function isValidInputPayout(inputPayout: number | null): boolean {
  return inputPayout != null && inputPayout >= 0;
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
  border: 1px solid #2d2d2d;
  color: #cdcdcd;
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
  display: flex;
  flex-direction: column;
  font-size: 14px;
  color: #cdcdcd;
  padding-left: 8px;
}

.rendered-by {
  margin-top: 4px;
  color: #a7a29c;
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
  border: 1px solid #2d2d2d;
  text-align: right;
  font-size: 14px;
  color: #cdcdcd;
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
  color: #8b8b8b;
  pointer-events: none;
  background: none;
  border: 1px solid transparent;
}

.payout-disp {
  text-align: right;
  font-size: 14px;
  color: #cdcdcd;
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
  color: #cdcdcd;
  background-color: #064373;
  border: 1px solid #1368aa;
  border-radius: 0;
}

.save-btn:active {
  background-color: #08365a;
  border-color: #13578c;
  color: #a3a3a3;
}

.save-btn.ignore {
  background-color: #6a4633;
  border-color: #916a5f;
}

.save-btn.ignore:active {
  background-color: #363636;
  border-color: #505050;
}

.edit-cnt {
  text-align: center;
  font-size: 14px;
  color: #cdcdcd;
}

.edit-link {
  visibility: hidden;
  color: #8b8b8b;
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
