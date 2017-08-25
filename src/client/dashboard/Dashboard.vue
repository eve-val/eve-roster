<template>
<div class="root">
  <app-header :identity="identity" />
  <div class="centering-container">
    <div class="title">
      Dashboard
      <loading-spinner
          class="main-spinner"
          ref="spinner"
          defaultState="hidden"
          />
    </div>
    <div class="characters-container">
      <pending-transfer-slab v-for="transfer in transfers"
          class="slab"
          :key="transfer.character"
          :characterId="transfer.character"
          :accountId="accountId"
          :name="transfer.name"
          @requireRefresh="onRequireRefresh"
          />
      <owned-character-slab v-for="character in characters"
          class="slab"
          :key="character.id"
          :accountId="accountId"
          :character="character"
          :loginParams="loginParams"
          :isMain="character.id == mainCharacter"
          :highlightMain="characters.length > 1"
          :access="access"
          :corp="character.corpId"
          :deleted="character.deleted"
          @requireRefresh="onRequireRefresh"
          />
      <div class="add-character" v-if="loginParams">
        <a class="add-character-link"
            :href="'https://login.eveonline.com/oauth/authorize?' + loginParams"
            >＋ Add a character</a>
        </div>
    </div>
  </div>
</div>
</template>

<script>
import _ from 'underscore';

import ajaxer from '../shared/ajaxer';

import AppHeader from '../shared/AppHeader.vue';
import LoadingSpinner from '../shared/LoadingSpinner.vue';

import OwnedCharacterSlab from './OwnedCharacterSlab.vue';
import PendingTransferSlab from './PendingTransferSlab.vue';


export default {
  components: {
    AppHeader,
    LoadingSpinner,
    OwnedCharacterSlab,
    PendingTransferSlab,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data: function() {
    return {
      accountId: null,
      characters: [],
      transfers: [],
      loginParams: null,
      mainCharacter: null,
      access: null,
    };
  },

  mounted: function() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      this.characters = [];
      this.transfers = [];
      this.loginParams = null;
      this.mainCharacter = null;
      this.access = null;

      this.$refs.spinner.observe(ajaxer.getDashboard())
      .then(response => {
        this.accountId = response.data.accountId;
        this.characters = response.data.characters;
        this.transfers = response.data.transfers;
        this.loginParams = response.data.loginParams;
        this.mainCharacter = response.data.mainCharacter;
        this.access = response.data.access;

        this.sortCharacters();

        return this.$refs.spinner.observe(ajaxer.getFreshSkillQueueSummaries());
      })
      .then(response => {
        let freshSummaries = response.data;
        for (let character of this.characters) {
          let updatedEntry = _.findWhere(freshSummaries, { id: character.id });
          if (updatedEntry) {
            character.skillQueue = updatedEntry.skillQueue;
          }
        }

        this.sortCharacters();
      });
    },

    onRequireRefresh(characterId) {
      this.fetchData();
    },

    sortCharacters() {
      this.characters.sort((a, b) => {
        let result = compareIsMainCharacter(a, b, this.mainCharacter);
        if (result == 0) {
          result = compareHasActiveSkillQueue(a, b);
        }
        if (result == 0) {
          result = a.name.localeCompare(b.name);
        }
        return result;
      });
    }
  },
}

function compareIsMainCharacter(a, b, mainCharacterId) {
  if (a.id == mainCharacterId) {
    return -1;
  } else if (b.id == mainCharacterId) {
    return 1;
  } else {
    return 0;
  }
}

function compareHasActiveSkillQueue(a, b) {
  let aActive = a.skillQueue.queueStatus == 'active';
  let bActive = b.skillQueue.queueStatus == 'active';

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

.slab, .add-character {
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
  color: #CDCDCD;
}
</style>
