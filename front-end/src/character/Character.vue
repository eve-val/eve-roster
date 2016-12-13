<template>
<div>
  <app-header :identity="identity" />
  <div v-if="!character">
    Loading...
  </div>
  <template v-if="character">
    <h1>{{ character.name }}</h1>
    <div class="split-container">
      <eve-image :id="character.characterId" type="Character" :size="256" />
      <tabbed-container
          :tabs="[
              { id: 'skills', label: 'Skills'},
              { id: 'api', label: 'API Key' },
            ]"
          class="tabs"
          style="margin-top: 10px;"
          >
        <template scope="props">
          <skills-tab v-show="props.selected.id == 'skills'"
              :skills="skills"
              />
          <api-key-tab v-show="props.selected.id == 'api'"
              :characterHasApiKeys="character.hasApiKeys"
              />
          
        </template>
      </tabbed-container>
    </div>
  </template>
</div>
</template>

<script>
import ajaxer from '../shared/ajaxer';
import AppHeader from '../shared/AppHeader.vue';
import EveImage from '../shared/EveImage.vue'; 
import TabbedContainer from '../shared/TabbedContainer.vue';

import ApiKeyTab from './ApiKeyTab.vue';
import SkillsTab from './SkillsTab.vue';

export default {
  components: {
    AppHeader,
    EveImage,
    TabbedContainer,

    ApiKeyTab,
    SkillsTab,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data: function() {
    return {
      character: null,
      skills: [],
    };
  },

  created: function() {
    ajaxer.fetchCharacter(this.$route.params.id)
      .then((response) => {
        this.character = response.data;
      })
      .catch((err) => {
        // TODO
        console.log('ERROR:', err);
      });

    ajaxer.fetchSkills(this.$route.params.id)
      .then((response) => {
        this.skills = response.data;
      })
      .catch((err) => {
        // TODO
        console.log('ERROR:', err);
      });
  },
}
</script>

<style scoped>
.split-container {
  display: flex;
}

.tabs {
  flex: 1;
  margin-left: 10px;
}
</style>