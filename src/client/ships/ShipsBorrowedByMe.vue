<template>
  <ships-wrapper title="Corp ships in my hangars" :identity="identity">
    <loading-spinner
      ref="spinner"
      class="main-spinner"
      default-state="hidden"
      size="34px"
    />
    <ship-table :ships="ships" :show-main-character="false" />
  </ships-wrapper>
</template>

<script>
import ajaxer from "../shared/ajaxer";

import ShipsWrapper from "./ShipsWrapper.vue";
import ShipTable from "./ShipTable.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

export default {
  components: {
    ShipsWrapper,
    ShipTable,
    LoadingSpinner,
  },

  props: {
    identity: { type: Object, required: true },
  },

  data: function () {
    return {
      ships: [],
    };
  },

  mounted: function () {
    this.$refs.spinner
      .observe(ajaxer.getShipsBorrowedByMe())
      .then((response) => {
        this.ships = response.data;
      });
  },
};
</script>
