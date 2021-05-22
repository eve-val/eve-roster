<!--

Overview page for the admin section

Right now just shows the sync status of each member corporation.

-->

<template>
  <admin-wrapper title="Overview" :identity="identity">
    <div class="root-container">
      <div class="description">
        In order to sync corp rosters, at least one character with the
        "Director" role must be authenticated with the proper scopes. To do
        this, the character's owner must log in to the roster as that character.
      </div>

      <loading-spinner
        class="spinner"
        ref="spinner"
        display="block"
        size="34px"
      >
      </loading-spinner>

      <template v-if="loaded && primaryCorps.length > 0">
        <div class="section-heading">Primary corporations</div>
        <member-corp-detail
          v-for="corp in primaryCorps"
          :corp="corp"
          :key="corp.id"
        >
        </member-corp-detail>
      </template>

      <template v-if="loaded && affiliatedCorps.length > 0">
        <div class="section-heading">Affiliate corporations</div>
        <member-corp-detail
          v-for="corp in affiliatedCorps"
          :corp="corp"
          :key="corp.id"
        >
        </member-corp-detail>
      </template>

      <div v-if="loaded && primaryCorps.length == 0" class="setup-bother">
        <img class="bother-icon" src="../shared-res/triangle-warning.svg" />
        <div>
          No corporations added yet. Configure them in
          <router-link to="/admin/setup">Setup</router-link>.
        </div>
      </div>
    </div>
  </admin-wrapper>
</template>

<script>
import _ from "underscore";

import ajaxer from "../shared/ajaxer";
import { NameCacheMixin } from "../shared/nameCache";

import AdminWrapper from "./AdminWrapper.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import MemberCorpDetail from "./overview/MemberCorpDetail.vue";

export default {
  components: {
    AdminWrapper,
    LoadingSpinner,
    MemberCorpDetail,
  },

  props: {
    identity: { type: Object, required: true },
  },

  data: function () {
    return {
      loaded: false,
      primaryCorps: [],
      affiliatedCorps: [],
    };
  },

  mounted: function () {
    this.$refs.spinner
      .observe(ajaxer.getAdminRosterSyncStatus())
      .then((response) => {
        this.addNames(response.data.names);
        const groups = _.groupBy(response.data.corporations, "type");
        this.primaryCorps = groups["full"];
        this.affiliatedCorps = groups["affiliated"];
        this.loaded = true;
      });
  },

  computed: {},

  methods: Object.assign({}, NameCacheMixin),
};
</script>

<style scoped>
.root-container {
  width: 676px;
}

.spinner {
  margin-top: 20px;
}

.description {
  font-size: 14px;
  font-weight: normal;
}

.section-heading {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 24px 0;
  font-weight: normal;
}

.setup-bother {
  display: flex;
  align-items: center;
  font-size: 14px;
  font-weight: normal;
  padding: 15px;
  background: #131313;
  margin-top: 30px;
}

.bother-icon {
  position: relative;
  top: -2px;
  width: 20px;
  height: 20px;
  margin-right: 9px;
}
</style>
