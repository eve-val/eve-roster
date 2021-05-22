<!--

Appropriately-spaced column labels for a table of LossRows.

-->

<template>
  <div class="_loss-heading">
    <div style="width: 228px; margin-left: 10px">Loss</div>
    <div style="width: 228px">Victim</div>
    <div style="width: 228px">Final blow</div>
    <div style="width: 212px; padding-left: 8px">Status</div>
    <div style="width: 77px; text-align: right; padding-right: 7px">Payout</div>
  </div>
</template>

<script>
export default {
  components: {},

  props: {},

  methods: {},
};
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
