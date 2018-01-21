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
      >
  </srp-triplet>

  <srp-triplet
      class="recipient"
      :icon-id="payment.recipient"
      icon-type="Character"
      :top-line="name(payment.recipient)"
      :bottom-line="name(payment.recipientCorp)"
      :icon-href="`/character/${payment.recipient}`"
      :top-href="`/character/${payment.recipient}`"
      >
  </srp-triplet>

  <div class="loss-count">{{ payment.totalLosses }}</div>

  <div class="payout">
    {{ displayPayout }}
    <span class="payout-denom">M</span>
  </div>

  <div class="spacer"></div>

  <srp-triplet
      v-if="payment.payer != undefined"
      class="payer"
      :icon-id="payment.payer"
      icon-type="Character"
      :top-line="name(payment.payer)"
      :bottom-line="name(payment.payerCorp)"
      :icon-href="`/character/${payment.payer}`"
      :top-href="`/character/${payment.payer}`"
      >
  </srp-triplet>
</div>
</template>

<script>
import Vue from 'vue';
import SrpTriplet from './SrpTriplet.vue';

import { NameCacheMixin } from '../shared/nameCache';


export default Vue.extend({
  components: {
    SrpTriplet,
  },

  props: {
    payment: { type: Object, required: true, },
  },

  computed: {
    displayPayout() {
      return (this.payment.totalPayout / 1000000).toFixed(0);
    },
  },

  methods: Object.assign({
  }, NameCacheMixin),
});
</script>

<style scoped>
._payment-history-row {
  display: flex;
  height: 77px;
  align-items: center;
  border-bottom: 1px solid #2C2C2C;

  font-size: 14px;
  color: #CDCDCD;
}

.payment {
  width: 270px;
  margin-left: 10px;
}

.recipient, .payer {
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
  color: #8B8B8B;
}

.spacer {
  flex: 1;
}

</style>
