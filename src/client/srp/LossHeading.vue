<!--

Appropriately-spaced column labels for a table of LossRows.

-->

<template>
  <div class="_loss-heading">
    <div style="width: 228px; margin-left: 10px">Loss</div>
    <div style="width: 228px">Victim</div>
    <div style="width: 122px">Final blow</div>
    <div style="width: 235px">Status</div>
    <div style="width: 94px">Category</div>
    <div style="width: 77px; text-align: right; padding-right: 7px">Payout</div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({});
</script>

<style scoped>
._loss-heading {
  display: flex;
  font-size: 14px;
  color: #a7a29c;

  padding-bottom: 5px;
  border-bottom: 1px solid #2c2c2c;
}
</style>
