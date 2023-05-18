<template>
  <div class="root">
    <app-header :identity="identity" />
    <div class="centering-container">
      <div class="title">
        Dashboard
        <loading-spinner
          :promise="promise"
          class="main-spinner"
          default-state="hidden"
        />
      </div>
      <div v-if="coreData" class="characters-container">
        <pending-transfer-slab
          v-for="transfer in transfers"
          :key="transfer.character"
          class="slab"
          :character-id="transfer.character"
          :account-id="coreData.accountId"
          :name="transfer.name"
          @require-refresh="onRequireRefresh"
        />
        <owned-character-slab
          v-for="character in characters"
          :key="character.id"
          class="slab"
          :account-id="coreData.accountId"
          :character="character"
          :login-params="coreData.loginParams"
          :is-main="character.id == coreData.mainCharacter"
          :highlight-main="characters.length > 1"
          :access="coreData.access"
          @require-refresh="onRequireRefresh"
        />
        <div class="add-character">
          <a
            class="add-character-link"
            :href="
              'https://login.eveonline.com/v2/oauth/authorize' +
              '?state=addCharacter.' +
              nonce +
              '&' +
              coreData.loginParams
            "
            >＋ Add a character</a
          >
        </div>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import _ from "underscore";

import ajaxer from "../shared/ajaxer";
import { AxiosResponse } from "axios";

import AppHeader from "../shared/AppHeader.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import OwnedCharacterSlab from "./OwnedCharacterSlab.vue";
import PendingTransferSlab from "./PendingTransferSlab.vue";

import { Identity } from "../home.js";
import {
  CharacterJson,
  Dashboard_GET,
} from "../../shared/route/api/dashboard_GET.js";

import { defineComponent, PropType, inject } from "vue";
export default defineComponent({
  components: {
    AppHeader,
    LoadingSpinner,
    OwnedCharacterSlab,
    PendingTransferSlab,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  setup() {
    const nonce = inject("nonce");
    return { nonce };
  },

  data() {
    return {
      coreData: null,
      characters: [],
      transfers: [],
      promise: null,
    } as {
      coreData: {
        accountId: number;
        loginParams: string;
        mainCharacter: number;
        access: Dashboard_GET["access"];
      } | null;
      characters: CharacterJson[];
      transfers: { character: number; name: string }[];
      promise: Promise<AxiosResponse> | null;
    };
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    async fetchData() {
      this.coreData = null;
      this.characters = [];
      this.transfers = [];

      const dashboardPromise = ajaxer.getDashboard();
      this.promise = dashboardPromise;

      const dashboardData = (await dashboardPromise).data;
      this.coreData = {
        accountId: dashboardData.accountId,
        loginParams: dashboardData.loginParams,
        mainCharacter: dashboardData.mainCharacter,
        access: dashboardData.access,
      };
      this.characters = dashboardData.characters;
      this.transfers = dashboardData.transfers;
      this.sortCharacters();

      const freshSkillsPromise = ajaxer.getFreshSkillQueueSummaries();
      this.promise = freshSkillsPromise;
      const freshSummaries = (await freshSkillsPromise).data;
      for (let character of this.characters) {
        let updatedEntry = _.findWhere(freshSummaries, {
          id: character.id,
        });
        if (updatedEntry) {
          character.skillQueue = updatedEntry.skillQueue;
        }
      }

      this.sortCharacters();
    },

    onRequireRefresh(_characterId: number) {
      this.fetchData();
    },

    sortCharacters() {
      const mainCharacter = this.coreData?.mainCharacter;
      if (mainCharacter == null) {
        return;
      }

      this.characters.sort((a: CharacterJson, b: CharacterJson) => {
        let result = compareIsMainCharacter(a, b, mainCharacter);
        if (result == 0) {
          result = compareHasActiveSkillQueue(a, b);
        }
        if (result == 0) {
          result = a.name.localeCompare(b.name);
        }
        return result;
      });
    },
  },
});

function compareIsMainCharacter(
  a: CharacterJson,
  b: CharacterJson,
  mainCharacterId: number | null
): number {
  if (a.id == mainCharacterId) {
    return -1;
  } else if (b.id == mainCharacterId) {
    return 1;
  } else {
    return 0;
  }
}

function compareHasActiveSkillQueue(
  a: CharacterJson,
  b: CharacterJson
): number {
  let aActive = a.skillQueue.queueStatus == "active";
  let bActive = b.skillQueue.queueStatus == "active";

  if (aActive && !bActive) {
    return -1;
  } else if (bActive && !aActive) {
    return 1;
  } else {
    return 0;
  }
}
</script>

<style scoped>
.root {
  font-size: 14px;
  font-weight: 300;
}

.centering-container {
  max-width: 1056px;
  margin: 0 auto;
}

.title {
  font-size: 30px;
  color: #a7a29c;
  font-weight: 100;
  margin: 40px 0 40px 32px;
}

.main-spinner {
  margin-left: 5px;
}

.characters-container {
  margin: 0 32px 0 0;
  display: flex;
  align-items: flex-start;
  flex-wrap: wrap;
}

.slab,
.add-character {
  margin-left: 32px;
  margin-bottom: 32px;
  flex: 0 0 auto;
}

.add-character {
  width: 480px;
  height: 105px;
  border: 1px dashed #44403b;
  display: flex;
  justify-content: center;
  align-items: center;
  font-size: 18px;
  color: #a7a29c;
  font-weight: 300;
  box-sizing: border-box;
}

.add-character-link {
  color: #676767;
  text-decoration: none;
}

.add-character-link:hover {
  text-shadow: 0 0 6px rgba(255, 255, 255, 0.4);
  color: #848484;
}

.add-character-link:active {
  color: #cdcdcd;
}
</style>
