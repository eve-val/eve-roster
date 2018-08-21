<!--

Displays a single battle report

May also contain triage UI if triageMode is enabled.

-->

<template>
<div class="_battle-row">

  <div class="header">
    <div class="start-time">{{ battle.startLabel }}</div>
    <div class="locations">{{ battle.locations.map(name).join(', ') }}</div>
    <div class="total-losses">{{ formatIskValue(battleLosses) }}</div>
  </div>

  <div class="team-row"
      v-for="team in battle.teams"
      :key="team.corporationId"
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
        >
    </srp-triplet>
    <div v-else class="empty-team">Unaffiliated</div>
    <div class="participant-cnt">
      <div class="participant"
          v-for="member in team.members"
          :key="member.id"
          >
        <tooltip gravity="center top">
          <a
              class="killmail-link"
              :href="member.loss ?
                  zkillHref(member.loss.killmailId, 'kill') : undefined"
              target="_blank"
              >
            <eve-image
                class="ship-image"
                :id="member.shipId"
                :size="36"
                type="Type"
                >
            </eve-image>
          </a>
          <srp-triplet
              class="hover-triplet"
              slot="message"
              :icon-id="member.characterId || member.shipId"
              :icon-type="member.characterId ? 'Character' : 'Type'"
              :top-line="name(member.characterId || member.shipId)"
              :bottom-line="name(member.shipId)"
              >
          </srp-triplet>
        </tooltip>
        <div class="death-scrim" v-if="member.loss"></div>
      </div>
    </div>
    <div class="loss-count">{{ formatIskValue(team.totalLosses) }}</div>
  </div>
  <div class="srp-cnt" v-if="battle.srps.length > 0">
    <div
        class="srp"
        v-for="srp in battle.srps"
        :key="srp.killmail"
        >
      <srp-triplet
          class="srp-triplet"
          :icon-id="srp.shipType"
          :icon-type="'Type'"
          :top-line="name(srp.victim)"
          :bottom-line="name(srp.shipType)"
          :default-href="zkillHref(srp.killmail, 'kill')"
          >
      </srp-triplet>
      <srp-status
          :srp="srp"
          :has-edit-priv="hasEditPriv"
          :start-in-edit-mode="startInEditMode"
          >
      </srp-status>
    </div>
  </div>
</div>
</template>

<script>
import Vue from 'vue';
import EveImage from '../../shared/EveImage.vue';
import SrpTriplet from '../SrpTriplet.vue';
import SrpStatus from '../SrpStatus.vue';
import Tooltip from '../../shared/Tooltip.vue';
import { NameCacheMixin } from '../../shared/nameCache';
import { formatNumber } from '../../shared/numberFormat';


export default Vue.extend({
  components: {
    EveImage,
    SrpStatus,
    SrpTriplet,
    Tooltip,
  },

  props: {
    battle: { type: Object, required: true, },
    hasEditPriv: { type: Boolean, required: true, },
    startInEditMode: { type: Boolean, required: true, },
  },

  data() {
    return {
      status: 'inactive',   // inactive | active | error
    };
  },

  computed: {
    battleLosses() {
      let sum = 0;
      for (let team of this.battle.teams) {
        sum += team.totalLosses;
      }
      return sum;
    },
  },

  methods: Object.assign({
    zkillHref(id, type) {
      if (id == undefined) {
        return undefined;
      } else {
        return `https://zkillboard.com/${type}/${id}/`;
      }
    },

    formatIskValue(value) {
      return `${formatNumber(value)} ISK`;
    },
  }, NameCacheMixin),
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
  border-bottom: 1px solid #2C2C2C;
  padding-bottom: 5px;
}

.start-time {
  color: #CDCDCD;
}

.locations {
  flex: 1;
  text-align: center;
  color: #A7A29C;
}

.total-losses {
  color: #A7A29C;
}

.team-row {
  display: flex;
  align-items: center;
  margin-top: 13px;
}

.team-triplet, .empty-team {
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
  color: #A7A29C;
}


.srp-cnt {
  width: 665px;
  margin-left: 236px;
  margin-top: 10px;
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
