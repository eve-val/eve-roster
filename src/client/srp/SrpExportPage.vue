<!--

Page for searching killmails and their associated SRPs via various filters.

The resulting query can be exported to a tab-delimited clipboard which can be
pasted into an appropriate spreadsheet program.

-->

<template>
  <div class="_srp-query">
    <div class="filters">
      <div
        class="filter-option"
        :class="{ 'active-filter': statusQuery != null }"
      >
        <div class="filter-label">
          Status
          <button class="clear-filter-btn" @click="statusQuery = null"></button>
        </div>
        <select v-model="statusQuery" class="filter-input">
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="ineligible">Ineligible</option>
          <option value="paid">Paid</option>
        </select>
      </div>

      <div class="filter-option" :class="{ 'active-filter': tagQuery != null }">
        <div class="filter-label">
          Tag
          <button class="clear-filter-btn" @click="tagQuery = null"></button>
        </div>
        <select v-model="tagQuery" class="filter-input">
          <option value="corp">Corp</option>
          <option value="alliance">Alliance</option>
        </select>
      </div>

      <div
        class="filter-option"
        :class="{ 'active-filter': startDateQuery != null }"
      >
        <div class="filter-label">
          Since
          <button
            class="clear-filter-btn"
            @click="startDateQuery = null"
          ></button>
        </div>
        <input v-model="startDateQuery" type="date" class="filter-input" />
      </div>

      <div
        class="filter-option"
        :class="{ 'active-filter': endDateQuery != null }"
      >
        <div class="filter-label">
          Before
          <button
            class="clear-filter-btn"
            @click="endDateQuery = null"
          ></button>
        </div>
        <input v-model="endDateQuery" type="date" class="filter-input" />
      </div>

      <tool-tip gravity="top end" :show-message="showCsvWarning">
        <button class="csv-btn" @click="onExportCsvClicked">
          <img class="csv-btn-icon" :src="csvIcon" />
          Clipboard
        </button>
        <template #message>
          <div class="csv-warning-message">
            <img
              class="csv-warning-icon"
              src="../shared-res/circle-error.svg"
            />
            <div style="flex: 1">
              Your query is too large to be copied in its entirety.
            </div>
          </div>
        </template>
      </tool-tip>
    </div>
  </div>
  <div class="results-cnt">
    <loss-heading />
    <loss-row
      v-for="row in results"
      :key="row.killmail"
      :srp="row"
      :has-edit-priv="identity.access['srp'] == 2"
    />

    <div v-if="results.length == 0" class="no-results">No results</div>

    <div v-else class="results-summary">
      <div class="result-count" style="flex: 1">{{ results.length }} rows</div>
      <div class="total-payout">
        <span class="total-payout-label">Total</span>
        <span class="total-payout-amount">{{ totalPayoutDisp }}</span>
        <span class="total-payout-demon">ISK</span>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import moment from "moment";

import LossHeading from "./LossHeading.vue";
import LossRow from "./LossRow.vue";
import ToolTip from "../shared/ToolTip.vue";

import downloadIcon from "./download-icon.svg";
import checkCircleIcon from "./check-circle-icon.svg";
import circleErrorIcon from "../shared-res/circle-error.svg";

import {
  SrpLossJson,
  UnifiedSrpLossStatus,
} from "../../shared/types/srp/SrpLossJson";
import { NameCacheMixin } from "../shared/nameCache";
import ajaxer from "../shared/ajaxer";
import { Identity } from "../home";
import { SimpleMap, nil } from "../../shared/util/simpleTypes";
import { useRoute, useRouter } from "vue-router";
import { first } from "../../shared/util/collections";

export default defineComponent({
  components: {
    LossHeading,
    LossRow,
    ToolTip,
  },

  mixins: [NameCacheMixin],

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  setup() {
    return {
      route: useRoute(),
      router: useRouter(),
    };
  },

  data() {
    return {
      results: [] as SrpLossJson[],
      searchStatus: "inactive" as "inactive" | "active" | "error",
      copyStatus: "inactive" as "inactive" | "success" | "error",
      copyIconTimeoutId: null as NodeJS.Timeout | null,
    };
  },

  computed: {
    statusQuery: {
      get(): string | null {
        return first(this.route.query.status);
      },
      set(value: UnifiedSrpLossStatus | null) {
        this.router.replace({
          query: {
            ...this.route.query,
            status: cleanUserDate(value),
          },
        });
      },
    },

    tagQuery: {
      get(): string | null {
        return first(this.route.query.tag);
      },
      set(value: string) {
        this.router.replace({
          query: {
            ...this.route.query,
            tag: cleanUserDate(value),
          },
        });
      },
    },

    startDateQuery: {
      get(): string | null {
        return first(this.route.query.startDate);
      },
      set(value: string | null) {
        this.router.replace({
          query: {
            ...this.route.query,
            startDate: cleanUserDate(value),
          },
        });
      },
    },

    endDateQuery: {
      get(): string | null {
        return first(this.route.query.endDate);
      },
      set(value: string | null) {
        this.router.replace({
          query: {
            ...this.route.query,
            endDate: cleanUserDate(value),
          },
        });
      },
    },

    startDateChecked: {
      get(): boolean {
        return this.startDateQuery != null;
      },
      set(value: boolean) {
        if (!value) {
          this.startDateQuery = null;
        }
      },
    },

    hasAnyFilters(): boolean {
      return (
        this.statusQuery != null ||
        this.tagQuery != null ||
        this.startDateQuery != null ||
        this.endDateQuery != null
      );
    },

    maxRows(): number {
      return this.hasAnyFilters ? 400 : 50;
    },

    csvIcon(): string {
      switch (this.copyStatus) {
        case "inactive":
          return downloadIcon;
        case "success":
          return checkCircleIcon;
        case "error":
          return circleErrorIcon;
        default:
          throw new Error(`Unknown copy status: ${this.copyStatus}`);
      }
    },

    showCsvWarning(): boolean {
      return this.results.length >= this.maxRows;
    },

    totalPayoutDisp(): string {
      let sum = 0;
      for (const row of this.results) {
        sum += row.payout;
      }
      return sum.toLocaleString(undefined);
    },
  },

  watch: {
    statusQuery() {
      this.performSearch();
    },

    tagQuery() {
      this.performSearch();
    },

    startDateQuery() {
      this.performSearch();
    },

    endDateQuery() {
      this.performSearch();
    },
  },

  mounted() {
    this.performSearch();
  },

  methods: {
    async performSearch() {
      if (this.searchStatus == "active") {
        return;
      }
      this.searchStatus = "active";

      try {
        const response = await ajaxer.getRecentSrpLosses(this.buildFilter());
        this.results = response.data.srps;
        this.addNames(response.data.names);
      } catch (e) {
        // TODO: Handle or display error
      }
      this.searchStatus = "inactive";
    },

    buildFilter() {
      const filter = {
        order: "desc",
        limit: this.maxRows,
      } as SimpleMap<any>;

      if (this.statusQuery != null) {
        filter.status = this.statusQuery;
      }
      if (this.tagQuery != null) {
        filter.tag = this.tagQuery;
      }
      if (this.startDateQuery != null) {
        filter.startTimestamp = moment(this.startDateQuery).valueOf();
      }
      if (this.endDateQuery != null) {
        filter.endTimestamp = moment(this.endDateQuery).valueOf();
      }

      return filter;
    },

    onExportCsvClicked() {
      navigator.clipboard.writeText(this.generateCsv()).then(
        () => {
          this.copyStatus = "success";
        },
        () => {
          this.copyStatus = "error";
        },
      );
      if (this.copyIconTimeoutId) {
        clearTimeout(this.copyIconTimeoutId);
      }
      this.copyIconTimeoutId = setTimeout(
        () => (this.copyStatus = "inactive"),
        5000,
      );
    },

    generateCsv(): string {
      const rows = [] as string[];

      let totalPayout = 0;

      rows.push(
        [
          "Date",
          "Killmail",
          "Ship",
          "Victim",
          "Victim corp",
          "Executioner",
          "SRP status",
          "Payout (ISK)",
        ].join("\t"),
      );

      for (const row of this.results) {
        const outRow = [] as string[];

        outRow.push(moment(row.timestamp).format("YYYY-MM-DD"));
        outRow.push(`https://zkillboard.com/kill/${row.killmail}/`);
        outRow.push(this.name(row.shipType));
        outRow.push(this.name(row.victim ?? 0));
        outRow.push(this.name(row.victimCorp ?? 0));
        outRow.push(
          this.name(
            row.executioner.alliance ?? row.executioner.corporation ?? 0,
          ),
        );
        outRow.push(row.status);
        outRow.push(row.payout.toLocaleString());

        totalPayout += row.payout;

        rows.push(outRow.join("\t"));
      }

      rows.push("");

      rows.push(`\t\t\t\t\t\tTotal\t${totalPayout.toLocaleString()}`);

      rows.push("");
      rows.push("Generated from query:");
      rows.push(`Status\t${this.statusQuery}`);
      rows.push(`Tag\t${this.tagQuery}`);
      rows.push(`startDate\t${this.startDateQuery}`);
      rows.push(`endDate\t${this.endDateQuery}`);

      return rows.join("\r\n");
    },
  },
});

function cleanUserDate(value: string | nil) {
  return value == "" ? undefined : value ?? undefined;
}
</script>

<style scoped>
.filters {
  display: flex;
  font-size: 14px;
}

.filter-option {
  display: flex;
  align-items: center;
  margin-right: 20px;

  border-radius: 10px;
  border: 1px solid #474747;

  /* Causes our border-radius to clip children */
  overflow: hidden;
}

.filter-option.active-filter {
  border-color: #a88542;
}

.filter-label {
  color: #cdcdcd;
  padding: 0 18px;
  background-color: #21211f;
  position: relative;
  height: 100%;
  display: flex;
  align-items: center;
}

.filter-input {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  box-sizing: border-box;
  height: 37px;
  width: 150px;
  background: #161616;
  border: none;
  color: #fff;
  font-size: 14px;
  font-family: unset;
  border-radius: 0;
  padding-left: 11px;
  padding-right: 11px;
}

.filter-input::-webkit-calendar-picker-indicator {
  /* color: orange; */
  filter: invert();
}

select.filter-input {
  background-image: url("../shared-res/select-dropdown-stroke.svg");
  background-repeat: no-repeat;
  background-position: right 8px center;
}

.filter-input:focus {
  outline: none;
}

.active-filter > .filter-input {
  background-color: #a88542;
}

.results-cnt {
  margin-top: 40px;
  margin-bottom: 100px;
}

.clear-filter-btn {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  border: unset;
  background-color: #21211f;
  background-image: url("../shared-res/x-medium.svg");
  background-repeat: no-repeat;
  background-position: center;
  visibility: hidden;
}

.active-filter:hover .clear-filter-btn {
  visibility: visible;
}

.clear-filter-btn:hover {
  background-color: #3d3d3d;
}

.csv-btn {
  display: flex;
  align-items: center;

  box-sizing: border-box;
  height: 39px;
  padding: 0 12px;

  background-color: #161616;
  border: 1px solid #474747; /* #315b76 */
  border-radius: 10px;

  appearance: none;
  color: #cdcdcd;
  font-size: 14px;
  font-family: unset;
}

.csv-btn:hover {
  border-color: #777;
}

.csv-btn:active {
  border-color: #aaa;
  background-color: #202020;
}

.csv-btn-icon {
  width: 20px;
  height: 20px;
  margin-right: 6px;
}

.csv-warning-message {
  display: flex;
  align-items: center;
}

.csv-warning-icon {
  width: 20px;
  height: 20px;
  margin-right: 10px;
}

.results-summary {
  display: flex;
  font-size: 14px;
  margin-top: 30px;
}

.total-payout-label {
  margin-right: 50px;
}

.total-payout {
  padding-right: 94px;
}

.total-payout-demon {
  color: #8b8b8b;
  margin-left: 5px;
}

.no-results {
  font-size: 14px;
  margin-top: 40px;
  color: #a7a29c;
  text-align: center;
}
</style>
