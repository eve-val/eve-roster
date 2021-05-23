<template>
  <div class="root">
    <app-header :identity="identity" />

    <div class="centering-container">
      <div class="name-title">
        <template v-if="character">
          {{ character.name }}
        </template>
        <loading-spinner
          ref="spinner"
          display="block"
          default-state="hidden"
          size="34px"
        />
      </div>
      <div v-if="character" class="root-container">
        <div class="sidebar">
          <eve-image
            :id="characterId"
            type="Character"
            :size="274"
            style="border: 1px solid #463830"
          />
          <div class="factoid-title">Corporation</div>
          <div class="factoid">
            {{ corporationName || "-" }}
          </div>

          <template v-if="character">
            <div class="factoid-title">Total SP</div>
            <div class="factoid">
              {{ formatSp() }}
            </div>
          </template>

          <template v-if="account.main">
            <div class="factoid-title">Main</div>
            <div class="factoid">
              <router-link
                class="character-link"
                :to="'/character/' + account.main.id"
              >
                {{ account.main.name }}
              </router-link>
            </div>
          </template>

          <template v-if="account.alts">
            <div class="factoid-title">Alts</div>
            <div v-for="alt in account.alts" :key="alt.id" class="factoid">
              <router-link class="character-link" :to="'/character/' + alt.id">
                {{ alt.name }}
              </router-link>
            </div>
          </template>

          <template v-if="account.id != null">
            <template v-if="canWriteSrp">
              <div class="factoid-title">SRP</div>
              <div class="factoid">
                <router-link
                  class="srp-link"
                  :to="'/srp/history/' + account.id"
                >
                  View Losses
                </router-link>
              </div>
              <div class="factoid">
                <router-link class="srp-link" :to="'/srp/triage/' + account.id">
                  Triage Losses
                </router-link>
              </div>
            </template>

            <div class="factoid-title">Timezone</div>
            <factoid-selector
              v-if="canWriteTimezone"
              :options="timezoneOptions"
              :initial-value="account.activeTimezone"
              :submit-handler="submitTimezone.bind(this)"
            />
            <div v-else class="factoid">
              {{ account.activeTimezone || "-" }}
            </div>

            <template v-if="access.memberHousing > 0">
              <div class="factoid-title">Citadel</div>
              <factoid-selector
                v-if="canWriteCitadel"
                :options="citadelOptions"
                :initial-value="account.citadelName"
                :submit-handler="submitHousing.bind(this)"
              />
              <div v-else class="factoid">
                {{ account.citadelName || "-" }}
              </div>
            </template>

            <template v-if="account.groups != null">
              <div class="factoid-title">Groups</div>
              <div v-for="group in account.groups" :key="group" class="factoid">
                {{ group }}
              </div>
              <div v-if="account.groups.length == 0" class="factoid">-</div>
            </template>
          </template>

          <div class="factoid-title">Titles</div>
          <div v-for="title in character.titles" :key="title" class="factoid">
            {{ title }}
          </div>
          <div v-if="character.titles.length == 0" class="factoid">-</div>
        </div>
        <div class="content">
          <skill-sheet :character-id="characterId" :access="access" />
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import ajaxer from "../shared/ajaxer";
import AppHeader from "../shared/AppHeader.vue";
import EveImage from "../shared/EveImage.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import { formatNumber } from "../shared/numberFormat";

import FactoidSelector from "./FactoidSelector.vue";
import SkillSheet from "./SkillSheet.vue";
import { groupifySkills } from "./skills";

export default {
  components: {
    AppHeader,
    EveImage,
    LoadingSpinner,

    FactoidSelector,
    SkillSheet,
  },

  props: {
    identity: { type: Object, required: true },
  },

  data: function () {
    return {
      character: null,
      account: null,
      access: null,
      timezones: null,
      citadels: null,

      characterPromise: null,
      corporationName: null,
    };
  },

  computed: {
    characterId: function () {
      return parseInt(this.$route.params.id);
    },

    canWriteSrp: function () {
      return this.identity.access["srp"] == 2;
    },

    canWriteTimezone: function () {
      return this.access != null && this.access["memberTimezone"] == 2;
    },

    canWriteCitadel: function () {
      return this.access != null && this.access["memberHousing"] == 2;
    },

    timezoneOptions: function () {
      return this.timezones.map((timezone) => {
        let hint = TIMEZONE_HINTS[timezone];
        return {
          value: timezone,
          label: hint != null ? `${timezone} (${hint})` : timezone,
        };
      });
    },

    citadelOptions: function () {
      return this.citadels.map((citadel) => ({
        label: citadel,
        value: citadel,
      }));
    },
  },

  watch: {
    characterId(_value) {
      // We've transitioned from one character to another, so this component
      // is getting reused. Null out our data and fetch new data...
      this.character = null;
      this.corporationName = null;
      this.characterPromise = null;

      this.fetchData();
    },

    character(value) {
      if (value && value.corporationId) {
        ajaxer
          .getCorporation(value.corporationId)
          .then((response) => {
            this.corporationName = response.data.name;
          })
          .catch((e) => {
            // TODO
            console.log(e);
          });
      }
    },
  },

  mounted: function () {
    this.fetchData();
  },

  methods: {
    fetchData() {
      if (!this.characterId) {
        return;
      }
      this.$refs.spinner
        .observe(ajaxer.getCharacter(this.characterId))
        .then((response) => {
          this.character = response.data.character;
          this.account = response.data.account;
          this.access = response.data.access;
          if (response.data.citadels) {
            response.data.citadels.sort((a, b) => a.localeCompare(b));
          }
          this.citadels = response.data.citadels;
          this.timezones = response.data.timezones;
        });
    },

    formatSp() {
      if (this.character.totalSp) {
        return formatNumber(this.character.totalSp);
      } else {
        return "-";
      }
    },

    processSkillsData(skills) {
      let map = {};
      for (let skill of skills) {
        map[skill.id] = skill;
        skill.queuedLevel = null;
      }
      this.skillMap = map;
      this.skillGroups = groupifySkills(skills);
      this.maybeInjectQueueDataIntoSkillsMap();
    },

    maybeInjectQueueDataIntoSkillsMap() {
      if (this.skillsMap != null && this.queue != null) {
        for (let queueItem of this.queue) {
          this.skillsMap[queueItem.id].queuedLevel = queueItem.targetLevel;
        }
      }
    },

    submitTimezone(timezone) {
      return ajaxer.putAccountActiveTimezone(this.account.id, timezone);
    },

    submitHousing(citadelName) {
      return ajaxer.putAccountHomeCitadel(this.account.id, citadelName);
    },
  },
};

const TIMEZONE_HINTS = {
  "US West": "PT/MT",
  "US East": "CT/ET",
  "EU West": "WET/CET",
  "EU East": "EET/MSK/FET/TRT",
  Aus: null,
  Other: null,
};
</script>

<style scoped>
.root {
  font-weight: 300;
}

.centering-container {
  width: 1200px;
  margin: 0 auto;
}

.name-title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 33px;
}

.root-container {
  display: flex;
  margin-bottom: 200px;
}

.sidebar {
  flex: 0 0 auto;
  width: 274px;
  padding-left: 30px;
  padding-right: 50px;
}

.factoid-title {
  font-size: 14px;
  margin-top: 24px;
  color: #a7a29c;
}

.factoid {
  font-size: 14px;
  margin-top: 4px;
}

.character-link {
  color: #cdcdcd;
  text-decoration: none;
}

.character-link:hover {
  text-decoration: underline;
}

.srp-link {
  color: #cdcdcd;
  text-decoration: none;
}

.srp-link:hover {
  text-decoration: underline;
}

.content {
  flex: 1 1 auto;
}

.section-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 20px 0;
  font-weight: 300;
}
</style>
