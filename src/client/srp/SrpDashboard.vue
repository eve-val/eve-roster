<!--

Dashboard subpage of the SRP UI.

Displays the user's recent losses and SRP payments.

-->

<template>
<div class="_srp-dashboard">
  <div class="section-title">My payments</div>
  <payment-history
      :identity="identity"
      :compact-mode="true"
      :for-account="identity.account.id"
      >
  </payment-history>

  <div class="section-title">My losses</div>
  <loss-history
      :identity="identity"
      :compact-mode="true"
      :for-account="identity.account.id"
      >
  </loss-history>
</div>
</template>

<script>
import Vue from 'vue';

import LossHistory from'./LossHistory.vue';
import PaymentHistory from './PaymentHistory.vue';


export default Vue.extend({
  components: {
    LossHistory,
    PaymentHistory,
  },

  props: {
    identity: { type: Object, required: true, },
  },

  methods: {
  },
});
</script>

<style scoped>
._srp-dashboard {
  padding-bottom: 200px;
  margin-top: 80px;
}

.section-title {
  font-size: 18px;
  color: #A7A29C;
  margin-top: 40px;
  margin-bottom: 40px;
}
</style>
