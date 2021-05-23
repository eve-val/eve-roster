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

<script lang="ts">
import ajaxer from "../shared/ajaxer";
import { Ship } from "./ships";

import ShipsWrapper from "./ShipsWrapper.vue";
import ShipTable from "./ShipTable.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import { Identity } from "../home";

import { AxiosResponse } from "axios";

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
      ships: <Ship[]>[],
    };
  },

  mounted: function () {
    this.$refs.spinner
      .observe(ajaxer.getShipsBorrowedByMe())
      .then((response: AxiosResponse<Ship[]>) => {
        this.ships = response.data;
      });
  },
});
</script>
