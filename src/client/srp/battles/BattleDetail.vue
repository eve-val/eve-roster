<!--

Page for displaying details about a specific battle.

-->

<template>
  <app-page :identity="identity" :content-width="1100">
    <div class="title">Battle #{{ battleId }}</div>

    <loading-spinner ref="spinner" display="block" size="34px" />

    <battle-row
      v-if="battle != null"
      :battle="battle"
      :has-edit-priv="identity.access['srp'] == 2"
      :start-in-edit-mode="true"
    />
  </app-page>
</template>

<script>
import AppPage from "../../shared/AppPage.vue";
import LoadingSpinner from "../../shared/LoadingSpinner.vue";
import BattleRow from "./BattleRow.vue";

import ajaxer from "../../shared/ajaxer";
import { NameCacheMixin } from "../../shared/nameCache";

export default {
  components: {
    AppPage,
    LoadingSpinner,
    BattleRow,
  },

  props: {
    identity: { type: Object, required: true },
    battleId: { type: Number, required: true },
  },

  data() {
    return {
      battle: null,
    };
  },

  mounted() {
    this.fetchData();
  },

  methods: Object.assign(
    {
      fetchData() {
        this.battle = null;
        this.$refs.spinner
          .observe(ajaxer.getBattle(this.battleId, true))
          .then((response) => {
            this.addNames(response.data.names);
            this.battle = response.data.battles[0];
          });
      },
    },
    NameCacheMixin
  ),
};
</script>

<style scoped>
.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 0;
}
</style>
