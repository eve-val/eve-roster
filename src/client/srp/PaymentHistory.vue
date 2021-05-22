<!--

Table of PaymentHistoryRows.

-->

<template>
  <div class="_payment-history" :class="{ compact: compactMode }">
    <template v-if="payments != null">
      <div class="header">
        <div style="width: 270px; margin-left: 10px">SRP</div>
        <div style="width: 255px">Recipient</div>
        <div style="width: 65px; text-align: right">Losses</div>
        <div style="width: 135px; text-align: right">Total payout</div>
        <div style="flex: 1" />
        <div style="width: 255px">Paid by</div>
      </div>

      <payment-history-row
        v-for="payment in payments"
        :key="payment.id"
        :payment="payment"
      />

      <div v-if="payments.length == 0" class="no-results">No results</div>
    </template>

    <div v-if="suspectMoreToFetch" class="more-cnt">
      <more-button
        :promise="fetchPromise"
        :hide-button="payments == null"
        @fetch-requested="fetchNextResults"
      />
    </div>
  </div>
</template>

<script>
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import MoreButton from "./MoreButton.vue";
import PaymentHistoryRow from "./PaymentHistoryRow.vue";

import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";

export default {
  components: {
    LoadingSpinner,
    MoreButton,
    PaymentHistoryRow,
  },

  props: {
    identity: { type: Object, required: true },
    forAccount: { type: Number, required: false },
    compactMode: { type: Boolean, required: false, default: false },
  },

  data() {
    return {
      payments: null,
      fetchPromise: null,
      suspectMoreToFetch: true,
    };
  },

  computed: {
    resultsPerFetch() {
      return this.compactMode ? 3 : 30;
    },

    finalTimestamp() {
      if (!this.payments || this.payments.length == 0) {
        return undefined;
      } else {
        return this.payments[this.payments.length - 1].modified;
      }
    },
  },

  mounted() {
    this.fetchNextResults();
  },

  methods: Object.assign(
    {
      fetchNextResults() {
        this.fetchPromise = ajaxer.getSrpPaymentHistory({
          paid: this.forAccount != undefined ? undefined : true,
          order: "desc",
          orderBy: "modified",
          startingAfter: this.finalTimestamp,
          account: this.forAccount,
          limit: this.resultsPerFetch,
        });

        this.fetchPromise.then((response) => {
          this.addNames(response.data.names);

          this.payments = this.payments || [];
          for (let payment of response.data.payments) {
            this.payments.push(payment);
          }

          this.suspectMoreToFetch =
            response.data.payments.length == this.resultsPerFetch;
        });
      },
    },
    NameCacheMixin
  ),
};
</script>

<style scoped>
._payment-history {
  margin-bottom: 500px;
}

._payment-history.compact {
  margin-bottom: 20px;
}

.top-line {
  border-bottom: 1px solid #2c2c2c;
}

.header {
  display: flex;
  font-size: 14px;
  color: #a7a29c;
  padding-bottom: 5px;
  border-bottom: 1px solid #2c2c2c;
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
