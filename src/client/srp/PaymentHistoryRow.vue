<!--

A table row that represents a single SRP payment (either pending or paid).

-->

<template>
  <div class="_payment-history-row">
    <srp-triplet
      class="payment"
      :top-line="`SRP #${payment.id}`"
      :bottom-line="payment.modifiedStr"
      :top-href="`/srp/payment/${payment.id}`"
    />

    <srp-triplet
      class="recipient"
      :icon-id="payment.recipient"
      icon-type="Character"
      :top-line="name(payment.recipient)"
      :bottom-line="nameOrUnknown(payment.recipientCorp)"
      :icon-href="`/character/${payment.recipient}`"
      :top-href="`/character/${payment.recipient}`"
    />

    <div class="loss-count">
      {{ payment.totalLosses }}
    </div>

    <div class="payout">
      {{ displayPayout }}
      <span class="payout-denom">M</span>
    </div>

    <div class="spacer" />

    <srp-triplet
      v-if="payment.payer != undefined"
      class="payer"
      :icon-id="payment.payer"
      icon-type="Character"
      :top-line="name(payment.payer)"
      :bottom-line="nameOrUnknown(payment.payerCorp)"
      :icon-href="`/character/${payment.payer}`"
      :top-href="`/character/${payment.payer}`"
    />
  </div>
</template>

<script lang="ts">
import { defineComponent, PropType } from "vue";

import SrpTriplet from "./SrpTriplet.vue";

import { NameCacheMixin } from "../shared/nameCache";
import { PaymentJson } from "../../shared/route/api/srp/payment/payment_dir_GET";

export default defineComponent({
  components: {
    SrpTriplet,
  },

  mixins: [NameCacheMixin],

  props: {
    payment: { type: Object as PropType<PaymentJson>, required: true },
  },

  computed: {
    displayPayout(): string {
      return (this.payment.totalPayout / 1000000).toFixed(0);
    },
  },
});
</script>

<style scoped>
._payment-history-row {
  display: flex;
  height: 77px;
  align-items: center;
  border-bottom: 1px solid #2c2c2c;

  font-size: 14px;
  color: #cdcdcd;
}

.payment {
  width: 270px;
  margin-left: 10px;
}

.recipient,
.payer {
  width: 255px;
}

.loss-count {
  width: 65px;
  text-align: right;
}

.payout {
  width: 135px;
  text-align: right;
}

.payout-denom {
  color: #8b8b8b;
}

.spacer {
  flex: 1;
}
</style>
