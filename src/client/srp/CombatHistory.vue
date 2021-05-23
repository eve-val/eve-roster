<!--

Displays a list of recent combat activity in the corp

Contains either BattleHistory (default) or LossHistory, controllable via a
dropdown.

If in triage mode, results are ordered oldest to newest and triage options are
shown. If not, results are ordered newest to oldest.

-->

<template>
  <div class="_approve">
    <div v-if="!forAccount" class="mode-cnt">
      Show
      <select v-model="mode" class="mode-select">
        <option value="battles">Battle reports</option>
        <option value="losses">Losses</option>
      </select>
    </div>

    <div v-if="forAccount" class="account-header">
      Showing results for a single account:
    </div>

    <battle-history
      v-if="mode == 'battles'"
      :identity="identity"
      :triage-mode="triageMode"
    />

    <loss-history
      v-if="mode == 'losses'"
      :identity="identity"
      :for-account="forAccount"
      :triage-mode="triageMode"
    />
  </div>
</template>

<script>
import LossHistory from "./LossHistory.vue";
import BattleHistory from "./battles/BattleHistory.vue";

export default {
  components: {
    BattleHistory,
    LossHistory,
  },

  props: {
    forAccount: { type: Number, required: false, default: -1 },
    identity: { type: Object, required: true },
    triageMode: { type: Boolean, required: true },
  },

  data() {
    return {
      mode: this.forAccount ? "losses" : "battles",
    };
  },
};
</script>

<style scoped>
.mode-cnt {
  color: #a7a29c;
  font-size: 14px;
  margin-bottom: 30px;
}

.mode-select {
  width: 150px;
  height: 35px;
  background: #161616;
  border: 1px solid #2d2d2d;
  color: #cdcdcd;
  font-size: 14px;
  font-family: unset;
  border-radius: 0;
  padding-left: 11px;
}

.mode-select:focus {
  outline: none;
  border-color: #444;
}

.account-header {
  color: #a7a29c;
  font-size: 14px;
  margin-bottom: 30px;
}
</style>
