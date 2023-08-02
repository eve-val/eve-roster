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
        class="verdict-select dropdown"
        @change="onUserSelectVerdictOption"
      >
        <option
          v-for="option in verdictOptions"
          :key="option.key"
          :value="option.key"
        >
          {{ option.label }}
        </option>
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

    <div class="tag-cnt">
      <select
        v-if="editing"
        v-model="proposedVerdict.tag"
        class="tag-select dropdown"
        :disabled="!isApprovalSelected"
      >
        <option
          v-for="option in tagOptions"
          :key="option.value ?? ''"
          :value="option.value"
        >
          {{ option.label }}
        </option>
      </select>
      <div v-else class="tag-disp">
        {{ getTagLabel(srp.tag) }}
      </div>
    </div>

    <div class="payout-cnt">
      <div v-if="editing" class="payout-input-cnt">
        <input
          v-model="inputPayout"
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
          {{ srpDisplayPayout }}
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
          display="inline"
          size="30px"
          default-state="hidden"
          tooltip-gravity="left center"
          :promise="savePromise"
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
          display="inline"
          size="20px"
          default-state="hidden"
          tooltip-gravity="left center"
          :promise="editPromise"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from "underscore";

import LoadingSpinner from "../shared/LoadingSpinner.vue";
import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";

const REQUEST_STATUSES = ["inactive", "active", "error"] as const;
type RequestStatus = (typeof REQUEST_STATUSES)[number];

import { SrpLossJson } from "../../shared/types/srp/SrpLossJson";

import { defineComponent, PropType } from "vue";
import {
  SrpVerdictReason,
  SrpVerdictStatus,
  SrpVerdictTags,
} from "../../shared/types/srp/srpEnums";
import { checkNotNil } from "../../shared/util/assert";

export default defineComponent({
  components: {
    LoadingSpinner,
  },

  mixins: [NameCacheMixin],

  props: {
    initialSrp: { type: Object as PropType<SrpLossJson>, required: true },
    hasEditPriv: { type: Boolean, required: true },
    startInEditMode: { type: Boolean, required: true },
  },

  data() {
    return {
      srp: this.initialSrp,
      editing:
        this.hasEditPriv &&
        this.startInEditMode &&
        this.initialSrp.status == "pending",

      proposedVerdict: {
        status: this.initialSrp.status,
        reason: null as SrpVerdictReason | null,
        tag: null as string | null,
        // payout is tracked by the inputPayout field
      },

      selectedVerdictKey: this.initialSrp.triage
        ? this.initialSrp.triage.suggestedOption
        : "custom",
      inputPayout: rawPayoutToDisplayPayout(this.initialSrp.payout),
      saveStatus: "inactive" as RequestStatus,
      fetchTriageStatus: "inactive" as RequestStatus,
      originalPayout: null as number | null,
      savePromise: null as Promise<unknown> | null,
      editPromise: null as Promise<unknown> | null,
    };
  },

  computed: {
    srpDisplayPayout(): string {
      return rawPayoutToDisplayPayout(this.srp.payout);
    },

    numericalPayout(): number {
      return displayPayoutToRawPayout(this.inputPayout);
    },

    isApprovalSelected(): boolean {
      return this.proposedVerdict.status == SrpVerdictStatus.APPROVED;
    },

    isSaveButtonEnabled(): boolean {
      return (
        this.saveStatus != "active" &&
        !isNaN(this.numericalPayout) &&
        // require approved to have non-zero payout.
        (!this.isApprovalSelected || this.numericalPayout > 0)
      );
    },

    /**
     * Non-null we are editing a previously-approved loss. Represents an option
     * to reinstate that approval.
     */
    previousApprovalOption(): VerdictOption | null {
      if (this.srp.status == SrpVerdictStatus.APPROVED) {
        return {
          key: "approved_preexisting",
          label: "Approved",
          status: SrpVerdictStatus.APPROVED,
          reason: null,
          tag: this.srp.tag,
          payout: this.srp.payout,
        };
      }
      return null;
    },

    verdictOptions(): VerdictOption[] {
      let options: VerdictOption[] = [];

      if (this.previousApprovalOption != null) {
        options.push(this.previousApprovalOption);
      }

      if (this.srp.triage != null) {
        for (let option of this.srp.triage.extraOptions) {
          options.push({
            key: option.key,
            label: option.label,
            status: option.verdict,
            reason: null,
            tag: SrpVerdictTags.CORP,
            payout: option.payout,
          });
        }
      }

      options.push({
        key: CUSTOM_VERDICT_KEY,
        label: "Custom payout",
        status: SrpVerdictStatus.APPROVED,
        reason: null,
        tag: SrpVerdictTags.CORP,
        payout: 0,
      });

      for (let iv of INELIGIBLE_VERDICTS) {
        options.push({
          key: `${iv.status}_${iv.reason}`,
          label: iv.label,
          status: iv.status,
          reason: iv.reason,
          tag: null,
          payout: 0,
        });
      }
      return options;
    },

    tagOptions(): TagOption[] {
      const options = [] as TagOption[];

      if (this.proposedVerdict.status == SrpVerdictStatus.APPROVED) {
        options.push(...TAG_OPTIONS);
      }

      if (this.srp.tag == null) {
        if (this.srp.status != SrpVerdictStatus.PENDING) {
          options.push({
            label: "",
            value: null,
          });
        }
      } else if (_.findWhere(options, { value: this.srp.tag }) == null) {
        options.push({
          label: this.srp.tag,
          value: this.srp.tag,
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

  mounted() {
    if (this.editing) {
      this.syncProposalWithRemoteVerdict();
    }
  },

  methods: {
    onUserSelectVerdictOption() {
      const option = _.findWhere(this.verdictOptions, {
        key: this.selectedVerdictKey,
      });

      if (option != null) {
        this.applyVerdictOption(option);
      } else {
        console.log("No option for", this.selectedVerdictKey);
      }
    },

    onSaveClick() {
      if (this.saveStatus == "active") {
        return;
      }
      this.saveStatus = "active";

      const verdict = this.proposedVerdict.status;
      const reason = this.proposedVerdict.reason;
      const tag = this.proposedVerdict.tag;
      const payout = this.numericalPayout;
      if (isNaN(payout)) {
        console.log(`Cannot save: payout is NaN`);
        return;
      }

      const savePromise = ajaxer.putSrpLossVerdict(
        this.srp.killmail,
        verdict,
        reason,
        tag,
        payout,
      );
      this.savePromise = savePromise;
      savePromise
        .then((response) => {
          this.saveStatus = "inactive";
          this.srp.status = verdict;
          this.srp.reason = reason;
          this.srp.tag = tag;
          this.srp.payout = payout;
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

    async onEditClick() {
      if (this.srp.triage == null) {
        if (this.fetchTriageStatus == "active") {
          return;
        }
        this.fetchTriageStatus = "active";
        const editPromise = ajaxer.getSrpLossTriageOptions(this.srp.killmail);
        this.editPromise = editPromise;
        try {
          const response = await editPromise;
          this.fetchTriageStatus = "inactive";
          this.srp.triage = response.data.triage;
          this.syncProposalWithRemoteVerdict();
        } catch (e) {
          this.fetchTriageStatus = "error";
        }
      } else {
        this.syncProposalWithRemoteVerdict();
      }
      this.editing = true;
    },

    syncProposalWithRemoteVerdict() {
      let option: VerdictOption | undefined;

      switch (this.srp.status) {
        case SrpVerdictStatus.PENDING:
          option = _.findWhere(this.verdictOptions, {
            key: this.srp.triage?.suggestedOption,
          });
          break;
        case SrpVerdictStatus.APPROVED:
          option = checkNotNil(this.previousApprovalOption);
          break;
        case SrpVerdictStatus.INELIGIBLE:
          option = _.findWhere(this.verdictOptions, {
            status: SrpVerdictStatus.INELIGIBLE,
            reason: this.srp.reason,
          });
          break;
        case "paid":
          throw new Error(`Cannot edit an SRP verdict that has been paid`);
      }

      if (option == undefined) {
        // Fall back to default verdict option if necessary
        option = checkNotNil(
          _.findWhere(this.verdictOptions, { key: CUSTOM_VERDICT_KEY }),
        );
      }

      this.applyVerdictOption(option);

      this.selectedVerdictKey = option.key;
    },

    applyVerdictOption(option: VerdictOption) {
      this.proposedVerdict.status = option.status;
      this.proposedVerdict.reason = option.reason;
      this.proposedVerdict.tag = option.tag;
      this.updateInputPayout(option.payout);
    },

    updateInputPayout(value: number) {
      this.inputPayout = rawPayoutToDisplayPayout(value);
    },

    getStatusLabel(srp: SrpLossJson): string {
      switch (srp.status) {
        case SrpVerdictStatus.PENDING:
          return "Pending";
        case SrpVerdictStatus.APPROVED:
          return "Approved";
        case SrpVerdictStatus.INELIGIBLE:
          // eslint-disable-next-line no-case-declarations
          const option = _.findWhere(INELIGIBLE_VERDICTS, {
            reason: srp.reason ?? undefined,
          });
          return option?.label ?? "Ineligible (unknown)";
        case "paid":
          return "Paid";
      }
    },

    getTagLabel(tag: string | null): string {
      if (tag == null) {
        return "—"; // em-dash
      }
      const option = _.findWhere(TAG_OPTIONS, { value: tag });

      return option?.label ?? tag;
    },
  },
});

function rawPayoutToDisplayPayout(rawPayout: number | null): string {
  if (rawPayout == null) {
    return "0";
  }
  return Math.round(rawPayout / 1000000).toString();
}

function displayPayoutToRawPayout(displayPayout: string | null): number {
  if (displayPayout == null) {
    return 0;
  }
  return parseInt(displayPayout) * 1000000;
}

interface VerdictOption {
  key: string;
  label: string;
  status: SrpVerdictStatus;
  reason: SrpVerdictReason | null;
  tag: string | null;
  payout: number;
}

interface TagOption {
  label: string;
  value: string | null;
}

const CUSTOM_VERDICT_KEY = "custom";

const INELIGIBLE_VERDICTS = [
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NOT_COVERED,
    label: "Ineligible (not covered)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.INVALID_FIT,
    label: "Ineligible (invalid fit)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.INVALID_ENGAGEMENT,
    label: "Ineligible (invalid engagement)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NPC,
    label: "Ineligible (NPC)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.SOLO,
    label: "Ineligible (solo)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.OPT_OUT,
    label: "Ineligible (opt out)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.NO_LONGER_A_MEMBER,
    label: "Ineligible (no longer a member)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.OBSOLETE,
    label: "Ineligible (obsolete)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.MISC,
    label: "Ineligible (misc)",
  },
  {
    status: SrpVerdictStatus.INELIGIBLE,
    reason: SrpVerdictReason.CORP_PROVIDED,
    label: "Ineligible (corp provided ship)",
  },
];

const TAG_OPTIONS: TagOption[] = [
  {
    label: "Corp",
    value: "corp",
  },
  {
    label: "Alliance",
    value: "alliance",
  },
];
</script>

<style scoped>
._srp-status {
  display: flex;
  align-items: center;
}

.dropdown {
  height: 35px;
  background: #161616;
  border: 1px solid #2d2d2d;
  color: #cdcdcd;
  font-size: 14px;
  font-family: unset;
  border-radius: 0;
  padding-left: 11px;
}

.dropdown:focus {
  outline: none;
  border-color: #444;
}

.status-cnt {
  width: 220px;
}

.verdict-select {
  width: 100%;
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

.tag-cnt {
  width: 110px;
  margin-left: 8px;
  font-size: 14px;
}

.tag-select {
  width: 100%;
}

.tag-disp {
  padding-left: 14px;
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
