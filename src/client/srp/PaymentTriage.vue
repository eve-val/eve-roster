<!--

A table of PaymentTriageRow. Used when paying reimbursements to players.

-->

<template>
<div class="_payment-triage">

  <div class="selector-cnt">
    <div class="selector-label">Paying with</div>
    <character-selector
        :accountId="identity.account.id"
        v-model="payingCharacter"
        >
    </character-selector>
  </div>

  <template v-if="payments != null">
    <div class="top-line"></div>

    <payment-triage-row
        v-for="payment in payments"
        :key="payment.id"
        :payment="payment"
        :paying-character="payingCharacter"
        >
    </payment-triage-row>

    <div class="no-results" v-if="payments.length == 0">No results</div>
  </template>

  <div
      v-if="suspectMoreToFetch"
      class="more-cnt"
      >
    <more-button
        :promise="fetchPromise"
        :hide-button="payments == null"
        @fetch-requested="fetchNextResults"
        >
    </more-button>
  </div>
</div>
</template>

<script>
import Vue from 'vue';
import CharacterSelector from './CharacterSelector.vue';
import MoreButton from './MoreButton.vue';
import PaymentTriageRow from './PaymentTriageRow.vue';

import ajaxer from '../shared/ajaxer';
import { NameCacheMixin } from '../shared/nameCache';

const RESULTS_PER_FETCH = 30;


export default Vue.extend({
  components: {
    CharacterSelector,
    MoreButton,
    PaymentTriageRow,
  },

  props: {
    identity: { type: Object, required: true, },
  },

  computed: {
    finalId() {
      if (!this.payments || this.payments.length == 0) {
        return undefined;
      } else {
        return this.payments[this.payments.length - 1].id;
      }
    },
  },

  data() {
    return {
      fetchPromise: null,
      suspectMoreToFetch: true,

      payments: null,
      payingCharacter: null,
    };
  },



  mounted() {
    this.fetchNextResults();
  },

  methods: Object.assign({
    fetchNextResults() {
      this.fetchPromise = ajaxer.getSrpPaymentHistory({
        paid: false,
        order: 'asc',
        orderBy: 'id',
        startingAfter: this.finalId,
        account: this.forAccount,
        limit: RESULTS_PER_FETCH,
      });

      this.fetchPromise.then(response => {
        this.addNames(response.data.names);

        this.payments = this.payments || [];
        for (let payment of response.data.payments) {
          this.payments.push(payment);
        }

        this.suspectMoreToFetch =
            response.data.payments.length == RESULTS_PER_FETCH;
      });
    },
  }, NameCacheMixin),
});
</script>

<style scoped>
._payment-triage {
  margin-bottom: 300px;
}

.selector-cnt {
  display: flex;
  align-items: center;
  margin: 40px 0;
}

.selector-label {
  font-size: 14px;
  color: #A7A29C;
  margin-right: 10px;
}

.top-line {
  border-bottom: 1px solid #2C2C2C;
}

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;

  color: #A7A29C;
  font-size: 14px;
  font-style: italic;
}

.more-cnt {
  margin-top: 20px;
  text-align: center;
}

</style>
