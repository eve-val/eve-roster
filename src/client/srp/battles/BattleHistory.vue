<!--

Displays a list of battle reports

Battle reports are instances of BattleRow.

-->

<template>
  <div class="_battle-history">
    <template v-if="battles != null">
      <battle-row
        v-for="battle in battles"
        :key="battle.id"
        :battle="battle"
        :has-edit-priv="identity.access['srp'] == 2"
        :start-in-edit-mode="true"
      />
      <div v-if="battles.length == 0" class="no-results">No results</div>
    </template>

    <div v-if="suspectMoreToFetch" class="more-cnt">
      <more-button
        :promise="fetchPromise"
        :hide-button="battles == null"
        @fetch-requested="fetchNextResults"
      />
    </div>
  </div>
</template>

<script lang="ts">
import BattleRow from "./BattleRow.vue";
import MoreButton from "../MoreButton.vue";

import ajaxer from "../../shared/ajaxer";
import { NameCacheMixin } from "../../shared/nameCache";

import { Identity } from "../../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    BattleRow,
    MoreButton,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
    triageMode: { type: Boolean, required: false, default: false },
  },

  data() {
    return {
      battles: null,
      fetchPromise: null,
      suspectMoreToFetch: true,
    };
  },

  computed: {},

  watch: {
    triageMode(_value) {
      this.reset();
    },
  },

  mounted() {
    this.reset();
  },

  methods: Object.assign(
    {
      reset() {
        this.battles = null;
        this.fetchPromise = null;
        this.suspectMoreToFetch = true;
        this.fetchNextResults();
      },

      fetchNextResults() {
        const sentinelId =
          this.battles != null && this.battles.length > 0
            ? this.battles[this.battles.length - 1].id
            : null;
        const resultOrder = this.triageMode ? "asc" : "desc";

        this.fetchPromise = ajaxer.getBattles(
          {
            untriaged: this.triageMode,
            orderBy: [{ key: "battle_id", order: resultOrder }],
            limit: RESULTS_PER_FETCH,
            bound:
              sentinelId == null
                ? undefined
                : {
                    col: "battle_id",
                    cmp: resultOrder == "asc" ? ">" : "<",
                    value: sentinelId,
                  },
          },
          true
        );

        this.fetchPromise.then((response) => {
          this.addNames(response.data.names);
          if (this.battles == null) {
            this.battles = [];
          }
          for (let battle of response.data.battles) {
            this.battles.push(battle);
          }
          this.suspectMoreToFetch =
            response.data.battles.length == RESULTS_PER_FETCH;
        });
      },
    },
    NameCacheMixin
  ),
});

const RESULTS_PER_FETCH = 30;
</script>

<style scoped>
._battle-history {
  margin-bottom: 500px;
}

.no-results {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 70px;

  color: #a7a29c;
  font-size: 14px;
  font-style: italic;
}

.more-cnt {
  margin-top: 20px;
  text-align: center;
}
</style>
