<!--

A table of PaymentTriageRow. Used when paying reimbursements to players.

-->

<template>
  <div class="_payment-triage">
    <div class="toolbar">
      <div class="selector-cnt">
        <div class="selector-label">Paying with</div>
        <character-selector
          v-model="payingCharacter"
          :account-id="identity.account.id"
        />
      </div>
      <div class="liability-summary">
        <span class="liability-label">Approved liability:</span>
        <span class="liability-value">{{ approvedLiabilityDisplay }}</span>
        <span class="liability-denom">ISK</span>
      </div>
    </div>

    <template v-if="payments != null">
      <div class="top-line" />

      <payment-triage-row
        v-for="payment in payments"
        :key="payment.id"
        :payment="payment"
        :paying-character="payingCharacter"
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

<script lang="ts">
import CharacterSelector from "./CharacterSelector.vue";
import MoreButton from "./MoreButton.vue";
import PaymentTriageRow from "./PaymentTriageRow.vue";

import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";

const RESULTS_PER_FETCH = 30;

import { Payment } from "./types";
import { Identity } from "../home";
import { AxiosResponse } from "axios";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    CharacterSelector,
    MoreButton,
    PaymentTriageRow,
  },

  mixins: [NameCacheMixin],

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      fetchPromise: null,
      suspectMoreToFetch: true,

      payments: null,
      payingCharacter: null,

      approvedLiability: 0,
    } as {
      fetchPromise: null | Promise<AxiosResponse>;
      suspectMoreToFetch: boolean;
      payments: null | Payment[];
      payingCharacter: null | number;
      approvedLiability: number;
    };
  },

  computed: {
    finalId(): number | undefined {
      if (!this.payments || this.payments.length == 0) {
        return undefined;
      } else {
        return this.payments[this.payments.length - 1].id;
      }
    },

    approvedLiabilityDisplay(): string {
      if (!this.approvedLiability) {
        return "0";
      } else {
        return this.approvedLiability.toLocaleString();
      }
    },
  },

  mounted() {
    this.fetchNextResults();

    ajaxer.getSrpApprovedLiability().then((response: AxiosResponse<number>) => {
      this.approvedLiability = response.data.approvedLiability;
    });
  },

  methods: {
    fetchNextResults() {
      this.fetchPromise = ajaxer.getSrpPaymentHistory({
        paid: false,
        order: "asc",
        orderBy: "id",
        startingAfter: this.finalId,
        account: this.forAccount,
        limit: RESULTS_PER_FETCH,
      });

      this.fetchPromise.then((response: AxiosResponse) => {
        this.addNames(response.data.names);

        this.payments = this.payments || [];
        for (let payment of response.data.payments) {
          this.payments.push(payment);
        }

        this.suspectMoreToFetch =
          response.data.payments.length == RESULTS_PER_FETCH;
      });
    },
  },
});
</script>

<style scoped>
._payment-triage {
  margin-bottom: 300px;
}

.toolbar {
  display: flex;
  margin: 40px 0;
  align-items: center;
}

.selector-cnt {
  display: flex;
  flex: 1;
  align-items: center;
}

.selector-label {
  font-size: 14px;
  color: #a7a29c;
  margin-right: 10px;
}

.liability-summary {
  font-size: 14px;
}

.liability-label {
  color: #a7a29c;
}

.liability-denom {
  color: #8b8b8b;
}

.top-line {
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
