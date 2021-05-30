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

import { Ship } from "./ships";

import ShipsWrapper from "./ShipsWrapper.vue";
import ShipTable from "./ShipTable.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import { Identity } from "../home";
import { AxiosResponse } from "axios";
import { defineComponent, PropType, ref } from "vue";
export default defineComponent({
  components: {
    ShipsWrapper,
    ShipTable,
    LoadingSpinner,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  setup: () => {
    const spinner = ref<InstanceType<typeof LoadingSpinner>>();
    return { spinner };
  },

  data: function () {
    return {
      ships: [],
    } as {
      ships: Ship[];
    };
  },

  mounted: function () {
    this.spinner.value
      ?.observe(ajaxer.getAllBorrowedShips())
      .then((response: AxiosResponse<Ship[]>) => {
        this.ships = response.data;
      });
  },
});
</script>
