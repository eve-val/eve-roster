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
    />

    <div class="section-title">My losses</div>
    <loss-history
      :identity="identity"
      :compact-mode="true"
      :for-account="identity.account.id"
    />
  </div>
</template>

<script lang="ts">
import LossHistory from "./LossHistory.vue";
import PaymentHistory from "./PaymentHistory.vue";

import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    LossHistory,
    PaymentHistory,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  methods: {},
});
</script>

<style scoped>
._srp-dashboard {
  padding-bottom: 200px;
  margin-top: 80px;
}

.section-title {
  font-size: 18px;
  color: #a7a29c;
  margin-top: 40px;
  margin-bottom: 40px;
}
</style>
