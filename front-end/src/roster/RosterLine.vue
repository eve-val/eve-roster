<template>
  <div class="row" :class="{'roster-is-alt': !isMain}">
    <div class="alt-indicator">
      <template v-if="isMain && row.alts.length > 0">
        {{row.alts.length}}
      </template>
    </div>
    <eve-image :id="row.characterId" type="Character" :size="isMain ? 44 : 35" />
    <!--<img class="cell portrait" :src="portraitImageSrc">-->
    <div class="cell name">
      <router-link
          class="member-link"
          :to="'/character/' + row.characterId"
          >{{ row.name }}</router-link>
      <eve-image
          v-if="isAltCorp"
          :id="row.corporationId"
          type="Corporation"
          :size="30"
          class="altCorpBadge"
          />
    </div>
    <div class="cell login">{{ relativeLoginTime }}</div>
    <div class="cell siggy">{{ row.siggyScore }}</div>
    <div class="cell kills">{{ row.recentKills }}</div>
    <div class="cell losses">{{ row.recentLosses }}</div>
    <div class="cell citadel">{{ row.homeCitadel }}</div>
  </div>
</template>

<script>
import EveImage from '../shared/EveImage.vue'; 
import EveConstants from './EveConstants';

let moment = require('moment');

export default {
  components: {
    EveImage
  },

  props: {
    row: {
      type: Object,
      required: true,
    },
    isMain: {
      type: Boolean,
      required: false,
      default: true,
    }
  },

  computed: {
    relativeLoginTime: function() {
      return moment(this.row.logonDateTime).fromNow();
    },

    isAltCorp: function() {
      return this.row.corporationId != EveConstants.id.SAFE
    }
  }
}
</script>

<style scoped>
.row {
  display: flex;
  align-items: center;
  font-size: 14px;
}

.roster-is-alt {
  padding: 2px 0 2px 9px;
}

.cell {
  padding: 0 5px;
}

.alt-indicator {
  font-size: 12px;
  color: #AAA;
  text-align: center;
  width: 30px;
}

.portrait {
  width: 50px;
  height: 50px;
}

.name {
  width: 300px;
}

/*.roster-is-alt .name {
  width: 262px;
}*/

.login {
  width: 100px;
}

.siggy {
  width: 60px;
  text-align: right;
}

.kills {
  width: 60px;
  text-align: right;
}

.losses {
  width: 60px;
  text-align: right;
}

.citadel {
  width: 150px;
}

.altCorpBadge {
  vertical-align: middle;
}

.member-link {
  color: inherit;
  text-decoration: none;
}

.member-link:hover {
  color: #4f7bc1;
  text-decoration: underline;
}

.member-link:active {
  color: #F90;
}

</style>