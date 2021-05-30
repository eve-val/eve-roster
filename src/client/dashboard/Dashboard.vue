<template>
  <div class="root">
    <app-header :identity="identity" />
    <div class="centering-container">
      <div class="title">
        Dashboard
        <loading-spinner
          ref="spinner"
          class="main-spinner"
          default-state="hidden"
        />
      </div>
      <div class="characters-container">
        <pending-transfer-slab
          v-for="transfer in transfers"
          :key="transfer.character"
          class="slab"
          :character-id="transfer.character"
          :account-id="accountId"
          :name="transfer.name"
          @requireRefresh="onRequireRefresh"
        />
        <owned-character-slab
          v-for="character in characters"
          :key="character.id"
          class="slab"
          :account-id="accountId"
          :character="character"
          :login-params="loginParams"
          :is-main="character.id == mainCharacter"
          :highlight-main="characters.length > 1"
          :access="access"
          @requireRefresh="onRequireRefresh"
        />
        <div v-if="loginParams" class="add-character">
          <a
            class="add-character-link"
            :href="
              'https://login.eveonline.com/oauth/authorize' +
              '?state=addCharacter&' +
              loginParams
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

import AppHeader from "../shared/AppHeader.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import OwnedCharacterSlab from "./OwnedCharacterSlab.vue";
import PendingTransferSlab from "./PendingTransferSlab.vue";

import { Identity } from "../home";
import { AxiosResponse } from "axios";
import { Output, CharacterJson } from "../../route/api/dashboard";

import { defineComponent, PropType, ref } from "vue";
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

  setup: () => {
    const spinner = ref<InstanceType<typeof LoadingSpinner>>();
    return { spinner };
  },

  data: function () {
    return {
      accountId: null,
      characters: [],
      transfers: [],
      loginParams: null,
      mainCharacter: null,
      access: null,
    } as {
      accountId: null | number;
      characters: CharacterJson[];
      transfers: { character: number; name: string }[];
      loginParams: Object | null;
      mainCharacter: number | null;
      access: { designateMain: number; isMember: boolean } | null;
    };
  },

  mounted: function () {
    this.fetchData();
  },

  methods: {
    fetchData() {
      this.characters = [];
      this.transfers = [];
      this.loginParams = null;
      this.mainCharacter = null;
      this.access = null;

      this.spinner.value
        ?.observe(ajaxer.getDashboard())
        .then((response: AxiosResponse<Output>) => {
          this.accountId = response.data.accountId;
          this.characters = response.data.characters;
          this.transfers = response.data.transfers;
          this.loginParams = response.data.loginParams;
          this.mainCharacter = response.data.mainCharacter;
          this.access = response.data.access;

          this.sortCharacters();

          return this.spinner.value?.observe(
            ajaxer.getFreshSkillQueueSummaries()
          );
        })
        .then((response: AxiosResponse) => {
          let freshSummaries = response.data;
          for (let character of this.characters) {
            let updatedEntry = _.findWhere(freshSummaries, {
              id: character.id,
            });
            if (updatedEntry) {
              character.skillQueue = updatedEntry.skillQueue;
            }
          }

          this.sortCharacters();
        });
    },

    onRequireRefresh(_characterId: number) {
      this.fetchData();
    },

    sortCharacters() {
      this.characters.sort((a: CharacterJson, b: CharacterJson) => {
        let result = compareIsMainCharacter(a, b, this.mainCharacter);
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
