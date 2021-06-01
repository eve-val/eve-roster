<!--

Page for displaying details about a specific battle.

-->

<template>
  <app-page :identity="identity" :content-width="1100">
    <div class="title">Battle #{{ battleId }}</div>

    <loading-spinner :promise="promise" display="block" size="34px" />

    <battle-row
      v-if="battle != null"
      :battle="battle"
      :has-edit-priv="identity.access['srp'] == 2"
      :start-in-edit-mode="true"
    />
  </app-page>
</template>

<script lang="ts">
import AppPage from "../../shared/AppPage.vue";
import LoadingSpinner from "../../shared/LoadingSpinner.vue";
import BattleRow from "./BattleRow.vue";

import ajaxer from "../../shared/ajaxer";
import { NameCacheMixin } from "../../shared/nameCache";

import { Battle } from "../types";
import { SimpleNumMap } from "../../../util/simpleTypes";

import { Identity } from "../../home";
import { AxiosResponse } from "axios";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AppPage,
    LoadingSpinner,
    BattleRow,
  },

  mixins: [NameCacheMixin],

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
    battleId: { type: Number, required: true },
  },

  data() {
    return {
      battle: null,
      promise: null,
    } as {
      battle: Battle | null;
      promise: Promise<any> | null;
    };
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      this.battle = null;
      const promise = ajaxer.getBattle(this.battleId, true);
      this.promise = promise;
      promise.then(
        (
          response: AxiosResponse<{
            battles: Battle[];
            names: SimpleNumMap<string>;
          }>
        ) => {
          this.addNames(response.data.names);
          this.battle = response.data.battles[0];
        }
      );
    },
  },
});
</script>

<style scoped>
.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 0;
}
</style>
