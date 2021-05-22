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

<script>
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import LossHeading from "./LossHeading.vue";
import LossRow from "./LossRow.vue";
import MoreButton from "./MoreButton.vue";

import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";

export default {
  components: {
    LoadingSpinner,
    LossHeading,
    LossRow,
    MoreButton,
  },

  props: {
    identity: { type: Object, required: true },
    forAccount: { type: Number, required: false },
    triageMode: { type: Boolean, required: false, default: false },
    compactMode: { type: Boolean, required: false, default: false },
  },

  data() {
    return {
      rows: null,
      fetchPromise: null,
      suspectMoreToFetch: true,
      relatedKillmail: null,
    };
  },

  computed: {
    resultsPerFetch() {
      return this.compactMode ? 10 : 30;
    },

    finalKillmail() {
      if (this.rows == null || this.rows.length == 0) {
        return undefined;
      } else {
        return this.rows[this.rows.length - 1].killmail;
      }
    },
  },

  watch: {
    triageMode(value) {
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

        this.fetchPromise.then((response) => {
          this.addNames(response.data.names);
          this.rows = this.rows || [];
          for (let srp of response.data.srps) {
            this.rows.push(srp);
          }
          this.suspectMoreToFetch =
            response.data.srps.length == this.resultsPerFetch;
        });
      },

      onRelatedHover(killmailId) {
        this.relatedKillmail = killmailId;
      },

      onRelatedUnhover(killmailId) {
        this.relatedKillmail = null;
      },
    },
    NameCacheMixin
  ),
};
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
