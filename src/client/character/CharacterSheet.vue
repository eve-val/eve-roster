<template>
  <div class="root">
    <app-header :identity="identity" />

    <div class="centering-container">
      <div class="name-title">
        <template v-if="coreData">
          {{ coreData.character.name }}
        </template>
        <loading-spinner
          :promise="promise"
          display="block"
          default-state="hidden"
          size="34px"
        />
      </div>
      <div v-if="coreData" class="root-container">
        <div class="sidebar">
          <eve-image
            :id="characterId"
            type="Character"
            :size="256"
            style="border: 1px solid #463830"
          />
          <div class="factoid-title">Corporation</div>
          <div class="factoid">
            {{ name(coreData.character.corporationId) }}
          </div>

          <div class="factoid-title">Total SP</div>
          <div class="factoid">
            {{ formatSp() }}
          </div>

          <template v-if="coreData.account.main">
            <div class="factoid-title">Main</div>
            <div class="factoid">
              <router-link
                class="character-link"
                :to="'/character/' + coreData.account.main.id"
              >
                {{ coreData.account.main.name }}
              </router-link>
            </div>
          </template>

          <template v-if="coreData.account.alts">
            <div class="factoid-title">Alts</div>
            <div
              v-for="alt in coreData.account.alts"
              :key="alt.id"
              class="factoid"
            >
              <router-link class="character-link" :to="'/character/' + alt.id">
                {{ alt.name }}
              </router-link>
            </div>
          </template>

          <template v-if="coreData.account.id != null">
            <template v-if="canWriteSrp">
              <div class="factoid-title">SRP</div>
              <div class="factoid">
                <router-link
                  class="srp-link"
                  :to="'/srp/history/' + coreData.account.id"
                >
                  View Losses
                </router-link>
              </div>
              <div class="factoid">
                <router-link
                  class="srp-link"
                  :to="'/srp/triage/' + coreData.account.id"
                >
                  Triage Losses
                </router-link>
              </div>
            </template>

            <div class="factoid-title">Timezone</div>
            <factoid-selector
              v-if="canWriteTimezone"
              :options="timezoneOptions"
              :initial-value="coreData.account.activeTimezone"
              :submit-handler="(value) => submitTimezone(value)"
            />
            <div v-else class="factoid">
              {{ coreData.account.activeTimezone ?? "-" }}
            </div>

            <template v-if="coreData.access.memberHousing > 0">
              <div class="factoid-title">Citadel</div>
              <factoid-selector
                v-if="canWriteCitadel"
                :options="citadelOptions"
                :initial-value="coreData.account.citadelName"
                :submit-handler="(value) => submitHousing(value)"
              />
              <div v-else class="factoid">
                {{ coreData.account.citadelName ?? "-" }}
              </div>
            </template>

            <template v-if="coreData.account.groups != null">
              <div class="factoid-title">Groups</div>
              <div
                v-for="group in coreData.account.groups"
                :key="group"
                class="factoid"
              >
                {{ group }}
              </div>
              <div v-if="coreData.account.groups.length == 0" class="factoid">
                -
              </div>
            </template>
          </template>

          <div class="factoid-title">Titles</div>
          <div
            v-for="title in coreData.character.titles"
            :key="title"
            class="factoid"
          >
            {{ title }}
          </div>
          <div v-if="coreData.character.titles.length == 0" class="factoid">
            -
          </div>

          <template v-if="canProxyApi">
            <div class="factoid-title">API Keys</div>
            <div class="factoid">
              <router-link class="api-link" :to="'/admin/api/' + characterId">
                Impersonate
              </router-link>
            </div>
          </template>
        </div>
        <div class="content">
          <skill-sheet :character-id="characterId" :access="coreData.access" />
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";
import AppHeader from "../shared/AppHeader.vue";
import EveImage from "../shared/EveImage.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import { NameCacheMixin } from "../shared/nameCache";
import { RouteReader } from "../shared/RouteReader";
import { formatNumber } from "../shared/numberFormat";
import { SimpleMap, SimpleNumMap } from "../../shared/util/simpleTypes";
import { first } from "../../shared/util/collections";

import FactoidSelector from "./FactoidSelector.vue";
import SkillSheet from "./SkillSheet.vue";
import { Skill } from "./skills";

import { Identity } from "../home";
import { Character, Account } from "../../shared/route/api/character_GET";

import { defineComponent, PropType } from "vue";

export default defineComponent({
  components: {
    AppHeader,
    EveImage,
    LoadingSpinner,

    FactoidSelector,
    SkillSheet,
  },

  mixins: [NameCacheMixin, RouteReader],

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      coreData: null as {
        character: Character;
        account: Account;
        access: SimpleMap<number>;
        timezones: string[] | undefined;
        citadels: string[] | undefined;
      } | null,
      skillsMap: null as SimpleNumMap<Skill> | null,
      queue: null as { id: number; targetLevel: number }[] | null,
      promise: null as Promise<any> | null,
    };
  },

  computed: {
    characterId: function (): number {
      return parseInt(first(this.route().params.id));
    },

    character(): Character | null {
      return this.coreData?.character ?? null;
    },

    account(): Account | null {
      return this.coreData?.account ?? null;
    },

    access(): SimpleMap<number> | null {
      return this.coreData?.access ?? null;
    },

    canWriteSrp: function (): boolean {
      return this.identity.access.srp == 2;
    },

    canProxyApi: function (): boolean {
      return this.identity.access.api == 2;
    },

    canWriteTimezone: function (): boolean {
      return this.access != null && this.access.memberTimezone == 2;
    },

    canWriteCitadel: function (): boolean {
      return this.access != null && this.access.memberHousing == 2;
    },

    timezoneOptions: function (): { value: string; label: string }[] {
      if (this.coreData?.timezones == undefined) {
        return [];
      }
      return this.coreData?.timezones.map((timezone: string) => {
        let hint = TIMEZONE_HINTS[timezone];
        return {
          value: timezone,
          label: hint != null ? `${timezone} (${hint})` : timezone,
        };
      });
    },

    citadelOptions: function (): { label: string; value: string }[] {
      if (this.coreData?.citadels == undefined) {
        return [];
      }
      return this.coreData?.citadels.map((citadel: string) => ({
        label: citadel,
        value: citadel,
      }));
    },
  },

  watch: {
    characterId(_value: number) {
      // We've transitioned from one character to another, so this component
      // is getting reused. Null out our data and fetch new data...
      this.coreData = null;

      this.fetchData();
    },
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    async fetchData() {
      if (!this.characterId) {
        return;
      }
      const promise = ajaxer.getCharacter(this.characterId);
      this.promise = promise;

      const response = await promise;

      const { character, account, access, citadels, timezones, names } =
        response.data;
      if (citadels) {
        citadels.sort((a: string, b: string) => a.localeCompare(b));
      }
      this.coreData = { character, account, access, citadels, timezones };
      this.addNames(names);
    },

    formatSp() {
      if (this.character?.totalSp) {
        return formatNumber(this.character.totalSp);
      } else {
        return "-";
      }
    },

    submitTimezone(timezone: string) {
      if (this.account?.id == null) {
        return Promise.resolve();
      }
      return ajaxer.putAccountActiveTimezone(this.account.id, timezone);
    },

    submitHousing(citadelName: string) {
      if (this.account?.id == null) {
        return Promise.resolve();
      }
      return ajaxer.putAccountHomeCitadel(this.account.id, citadelName);
    },
  },
});

const TIMEZONE_HINTS: Record<string, string | null> = {
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
  max-width: 300px;
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
</style>
