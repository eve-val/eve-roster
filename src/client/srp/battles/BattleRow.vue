<!--

Displays a single battle report

May also contain triage UI if triageMode is enabled.

-->

<template>
  <div class="_battle-row">
    <div class="header">
      <router-link class="start-time" :to="`/srp/battle/${battle.id}`">
        {{ battle.startLabel }}
      </router-link>
      <div class="locations">
        {{ battle.locations.map(name).join(", ") }}
      </div>
      <div class="total-losses">
        {{ formatIskValue(battleLosses) }}
      </div>
    </div>

    <div
      v-for="team in battle.teams"
      :key="team.corporationId"
      class="team-row"
    >
      <srp-triplet
        v-if="team.corporationId != 0"
        class="team-triplet"
        :icon-id="team.corporationId"
        :icon-type="'Corporation'"
        :top-line="name(team.corporationId)"
        :bottom-line="team.allianceId && name(team.allianceId)"
        :default-href="zkillHref(team.corporationId, 'corporation')"
        :bot-href="team.allianceId && zkillHref(team.allianceId, 'alliance')"
      />
      <div v-else class="empty-team">Unaffiliated</div>
      <div class="participant-cnt">
        <div
          v-for="member in team.members"
          :key="member.id"
          class="participant"
        >
          <tool-tip gravity="top">
            <template #default>
              <a
                class="killmail-link"
                :href="
                  member.loss
                    ? zkillHref(member.loss.killmailId, 'kill')
                    : undefined
                "
                target="_blank"
              >
                <eve-image
                  :id="member.shipId"
                  class="ship-image"
                  :size="36"
                  type="Type"
                />
              </a>
            </template>
            <template #message>
              <srp-triplet
                class="hover-triplet"
                :icon-id="member.characterId || member.shipId"
                :icon-type="member.characterId ? 'Character' : 'Type'"
                :top-line="name(member.characterId || member.shipId)"
                :bottom-line="name(member.shipId)"
              />
            </template>
          </tool-tip>
          <div v-if="member.loss" class="death-scrim" />
        </div>
      </div>
      <div class="loss-count">
        {{ formatIskValue(team.totalLosses) }}
      </div>
    </div>
    <div v-if="battle.srps.length > 0" class="srp-cnt">
      <div v-for="srp in battle.srps" :key="srp.killmail" class="srp">
        <srp-triplet
          class="srp-triplet"
          :icon-id="srp.shipType"
          :icon-type="'Type'"
          :top-line="name(srp.victim)"
          :bottom-line="name(srp.shipType)"
          :default-href="zkillHref(srp.killmail, 'kill')"
        />
        <srp-status
          :initial-srp="srp"
          :has-edit-priv="hasEditPriv"
          :start-in-edit-mode="startInEditMode"
        />
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import EveImage from "../../shared/EveImage.vue";
import SrpTriplet from "../SrpTriplet.vue";
import SrpStatus from "../SrpStatus.vue";
import ToolTip from "../../shared/ToolTip.vue";
import { NameCacheMixin } from "../../shared/nameCache";
import { formatNumber } from "../../shared/numberFormat";
import { BattleJson } from "../../../shared/route/api/srp/battle/battle_GET";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    EveImage,
    SrpStatus,
    SrpTriplet,
    ToolTip,
  },

  mixins: [NameCacheMixin],

  props: {
    battle: { type: Object as PropType<BattleJson>, required: true },
    hasEditPriv: { type: Boolean, required: true },
    startInEditMode: { type: Boolean, required: true },
  },

  computed: {
    battleLosses(): number {
      let sum = 0;
      for (let team of this.battle.teams) {
        sum += team.totalLosses;
      }
      return sum;
    },
  },

  methods: {
    zkillHref(id: undefined | number, type: string): undefined | string {
      if (id == undefined) {
        return undefined;
      } else {
        return `https://zkillboard.com/${type}/${id}/`;
      }
    },

    formatIskValue(value: number): string {
      return `${formatNumber(value)} ISK`;
    },
  },
});
</script>

<style scoped>
._battle-row {
  width: 901px;
  font-size: 14px;
  margin-bottom: 60px;
}

.header {
  display: flex;
  border-bottom: 1px solid #2c2c2c;
  padding-bottom: 5px;
}

.start-time {
  color: #cdcdcd;
  text-decoration: none;
}

.start-time:hover {
  text-decoration: underline;
}

.locations {
  flex: 1;
  text-align: center;
  color: #a7a29c;
}

.total-losses {
  color: #a7a29c;
}

.team-row {
  display: flex;
  align-items: center;
  margin-top: 13px;
}

.team-triplet,
.empty-team {
  width: 230px;
  margin-right: 20px;
}

.empty-team {
  padding-left: 58px;
  box-sizing: border-box;
}

.participant-cnt {
  display: flex;
  flex: 1;
  flex-wrap: wrap;
}

.participant {
  position: relative;
  margin-right: 4px;
  margin-bottom: 4px;
}

.hover-triplet {
  width: 300px;
}

.killmail-link {
  display: inline-block;
}

.death-scrim {
  position: absolute;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 0, 0, 0.4);
  pointer-events: none;
}

.ship-image {
  vertical-align: middle;
}

.loss-count {
  width: 100px;
  text-align: right;
  color: #a7a29c;
}

.srp-cnt {
  margin-top: 15px;
}

.srp {
  display: flex;
  height: 76px;

  align-items: center;
  padding: 0 14px;
  background-color: #191919;
}

.srp + .srp {
  border-top: 1px solid #202020;
}

.srp-triplet {
  flex: 1 1 0;
  margin-right: 4px;
}
</style>
