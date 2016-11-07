<template>
  <div class="roster-row" :class="{'roster-is-alt': !isMain}">
    <img class="roster-cell roster-portrait" :src="portraitImageSrc">
    <div class="roster-cell roster-row-name">{{ row.name }}</div>
    <div class="roster-cell roster-row-login">{{ relativeLoginTime }}</div>
    <div class="roster-cell roster-row-siggy">{{ row.siggyScore }}</div>
    <div class="roster-cell roster-row-kills">{{ row.recentKills }}</div>
    <div class="roster-cell roster-row-losses">{{ row.recentLosses }}</div>
    <div class="roster-cell roster-row-citadel">{{ row.homeCitadel }}</div>
  </div>
</template>

<script>
let moment = require('moment');

export default {
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

    portraitImageSrc: function() {
      return '//image.eveonline.com/Character/' + this.row.characterID + 
          '_32.jpg';
    }
  }
}
</script>

<style>
.roster-row {
  margin: 10px 0 10px 0;
}

.roster-is-alt {
  padding-left: 15px;
}

.roster-cell {
  display: inline-block;
  vertical-align: middle;
}

.roster-portrait {
  width: 32px;
  height: 32px;
}

.roster-row-name {
  width: 300px;
}

.roster-is-alt .roster-row-name {
  width: 285px;
}

.roster-row-login {
  width: 100px;
}

.roster-row-siggy {
  width: 30px;
  text-align: right;
}

.roster-row-kills {
  width: 30px;
  text-align: right;
}

.roster-row-losses {
  width: 30px;
  text-align: right;
}

.roster-row-citadel {
  width: 150px;
  padding-left: 20px;
}

</style>