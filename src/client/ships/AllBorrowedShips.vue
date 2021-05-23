<template>
  <ships-wrapper title="All borrowed corp ships" :identity="identity">
    <loading-spinner
      ref="spinner"
      class="main-spinner"
      default-state="hidden"
      size="34px"
    />
    <ship-table :ships="ships" :show-main-character="true" />
  </ships-wrapper>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";

import ShipsWrapper from "./ShipsWrapper.vue";
import ShipTable from "./ShipTable.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    ShipsWrapper,
    ShipTable,
    LoadingSpinner,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data: function () {
    return {
      ships: [],
    };
  },

  mounted: function () {
    this.$refs.spinner
      .observe(ajaxer.getAllBorrowedShips())
      .then((response) => {
        this.ships = response.data;
      });
  },
});
</script>
