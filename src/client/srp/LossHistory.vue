<!--

A table of LossRows.

Exposes various options for filtering the contents of the table.

-->

<template>
  <div class="_loss-history" :class="{ compact: compactMode }">
    <template v-if="rows != null">
      <loss-heading />
      <loss-row
        v-for="row in rows"
        :key="row.killmail"
        :srp="row"
        :has-edit-priv="identity.access['srp'] == 2"
        :start-in-edit-mode="triageMode"
        :highlight-as-related="row.killmail == relatedKillmail"
        @related-hover="onRelatedHover"
        @related-unhover="onRelatedUnhover"
      />
      <div v-if="rows.length == 0" class="no-results">No results</div>
    </template>

    <div v-if="suspectMoreToFetch" class="more-cnt">
      <more-button
        :promise="fetchPromise"
        :hide-button="rows == null"
        @fetch-requested="fetchNextResults"
      />
    </div>
  </div>
</template>

<script lang="ts">
import LossHeading from "./LossHeading.vue";
import LossRow from "./LossRow.vue";
import MoreButton from "./MoreButton.vue";

import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";
import { Loss } from "./types";
import { SimpleNumMap } from "../../util/simpleTypes";

import { Identity } from "../home";
import { AxiosResponse } from "axios";
type Resp = AxiosResponse<{ srps: Loss[]; names: SimpleNumMap<string> }>;
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    LossHeading,
    LossRow,
    MoreButton,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
    forAccount: {
      type: Number as PropType<number | null>,
      required: false,
      default: null,
    },
    triageMode: {
      type: Boolean as PropType<boolean>,
      required: false,
      default: false,
    },
    compactMode: {
      type: Boolean as PropType<boolean>,
      required: false,
      default: false,
    },
  },

  data() {
    return {
      rows: null,
      fetchPromise: null,
      suspectMoreToFetch: true,
      relatedKillmail: null,
    } as {
      rows: null | Loss[];
      fetchPromise: null | Promise<Resp>;
      suspectMoreToFetch: boolean;
      relatedKillmail: null | number;
    };
  },

  computed: {
    resultsPerFetch(): number {
      return this.compactMode ? 10 : 30;
    },

    finalKillmail(): number {
      if (this.rows == null || this.rows.length == 0) {
        return undefined;
      } else {
        return this.rows[this.rows.length - 1].killmail;
      }
    },
  },

  watch: {
    triageMode(_value: boolean) {
      this.reset();
    },
  },

  mounted() {
    this.reset();
  },

  methods: Object.assign(
    {
      reset() {
        this.rows = null;
        this.fetchPromise = null;
        this.suspectMoreToFetch = true;
        this.fetchNextResults();
      },

      fetchNextResults() {
        this.fetchPromise = ajaxer.getRecentSrpLosses({
          pending: this.triageMode,
          order: this.triageMode ? "asc" : "desc",
          fromKillmail: this.finalKillmail,
          account: this.forAccount,
          limit: this.resultsPerFetch,
          includeTriage: this.triageMode,
        });

        this.fetchPromise.then((response: Resp) => {
          this.addNames(response.data.names);
          this.rows = this.rows || [];
          for (let srp of response.data.srps) {
            this.rows.push(srp);
          }
          this.suspectMoreToFetch =
            response.data.srps.length == this.resultsPerFetch;
        });
      },

      onRelatedHover(killmailId: number) {
        this.relatedKillmail = killmailId;
      },

      onRelatedUnhover(_killmailId: number) {
        this.relatedKillmail = null;
      },
    },
    NameCacheMixin
  ),
});
</script>

<style scoped>
._loss-history {
  margin-bottom: 500px;
}

._loss-history.compact {
  margin-bottom: 20px;
}

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;

  color: #a7a29c;
  font-size: 14px;
  font-style: italic;
}

.more-cnt {
  margin-top: 20px;
  text-align: center;
}
</style>
