<template>
<div class="root">
  <app-header :identity="identity" />

  <template v-if="character">
    <div class="name-title">{{ character.name }}</div>
    <div class="root-container">
      <div class="sidebar">
        <eve-image :id="characterId" type="Character" :size="274"
            style="border: 1px solid #463830;"
            />
        <div class="factoid-title">Corporation</div>
        <div class="factoid">{{ corporationName || '-' }}</div>

        <template v-if="character.main">
          <div class="factoid-title">Main</div>
          <div class="factoid">
            <router-link
                class="character-link"
                :to="'/character/' + character.main.id"
                >{{ character.main.name }}</router-link>
          </div>
        </template>

        <template v-if="character.alts">
          <div class="factoid-title">Alts</div>
          <div v-for="alt in character.alts"
              class="factoid">
            <router-link
                class="character-link"
                :to="'/character/' + alt.id"
                >{{ alt.name }}</router-link>
          </div>
        </template>

        <div class="factoid-title">Timezone</div>
        <div class="factoid">{{ character.activeTimezone || '-' }}</div>

        <div class="factoid-title">Citadel</div>
        <div class="factoid">{{ homeCitadel || '-' }}</div>
      </div>
      <div class="content">
        <div class="skills-container">
          <template v-if="queue && skillGroups">
            <div class="section-title"
                style="margin-top: 0;"
                >
                Training queue
            </div>
            <queue-entry v-for="(queueItem, i) in queue"
                :skill="skillMap[queueItem.id]"
                :queueData="queueItem"
                :position="i"
                />
          </template>
          <template v-if="skillGroups">
            <div class="section-title"
                :style="{ 'margin-top': queue == null ? '0px' : undefined, }"
                >Skills</div>
            <template v-for="skillGroup in skillGroups">
              <div class="skillgroup-title">{{ skillGroup.name }}</div>
              <div class="skillgroup-container">
                <div v-for="skill in skillGroup.skills"
                    class="skill"
                    >
                  <skill-pips class="skill-pips"
                      :trainedLevel="skill.level"
                      :queuedLevel="skill.queuedLevel || 0"
                      />
                  {{ skill.name }}
                </div>
              </div>
            </template>
          </template>
        </div>
      </div>
    </div>
  </template>
</div>
</template>

<script>
import skillGroups from '../../../shared/src/data/skill-groups.js'

import ajaxer from '../shared/ajaxer';
import AppHeader from '../shared/AppHeader.vue';
import EveImage from '../shared/EveImage.vue'; 
import TabbedContainer from '../shared/TabbedContainer.vue';

import QueueEntry from './QueueEntry.vue';
import SkillPips from './SkillPips.vue';

export default {
  components: {
    AppHeader,
    EveImage,
    TabbedContainer,

    SkillPips,
    QueueEntry,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data: function() {
    return {
      character: null,
      corporationName: null,
      queue: null,
      skillMap: null,
      skillGroups: null,
    };
  },

  computed: {
    characterId: function() {
      return parseInt(this.$route.params.id);
    },
  },

  created: function() {
    this.fetchData();
  },

  watch: {
    character: function(value) {
      if (value && value.corporationId) {
        ajaxer.getCorporation(value.corporationId)
            .then((response) =>  {
              this.corporationName = response.data.name;
            })
            .catch((e) => {
              // TODO
              console.log(e);
            });
      }
    },

    '$route' (to, from) {
      // We've transitioned from one character to another, so this component
      // is getting reused. Null out our data and fetch new data...
      this.character = null;
      this.corporationName = null;
      this.queue = null;
      this.skillMap = null;
      this.skillGroups = null;

      this.fetchData();
    },
  },

  methods: {
    fetchData: function() {
      ajaxer.getCharacter(this.characterId)
          .then((response) => {
            this.character = response.data;
          })
          .catch((err) => {
            // TODO
            console.log('ERROR:', err);
          });

      ajaxer.getSkills(this.characterId)
          .then((response) => {
            this.processSkillsData(response.data);
          })
          .catch((err) => {
            // TODO
            console.log('ERROR:', err);
          });
      
      ajaxer.getSkillQueue(this.characterId)
          .then((response) => {
            this.queue = response.data;
            this.maybeInjectQueueDataIntoSkillsMap();
          })
          .catch((err) => {
            // TODO
            console.log('ERROR:', err);
          });
    },

    processSkillsData: function(skills) {
      let map = {};
      for (let skill of skills) {
        map[skill.id] = skill;
        skill.queuedLevel = null;
      }
      this.skillMap = map;
      this.skillGroups = groupifySkills(skills);
      this.maybeInjectQueueDataIntoSkillsMap();
    },

    maybeInjectQueueDataIntoSkillsMap: function() {
      if (this.skillsMap != null && this.queue != null) {
        for (let queueItem of this.queue) {
          this.skillsMap[queueItem.id].queuedLevel = queueItem.targetLevel;
        }
      }
    },
  }
}

const GROUP_DISPLAY_ORDER = [
  257,    // Spaceship Command
  275,    // Navigation
  1216,   // Engineering
  1240,   // Subsystems
  1210,   // Armor
  1209,   // Shields

  1213,   // Targeting
  255,    // Gunnery
  256,    // Missiles
  273,    // Drones
  272,    // Electronic Systems
  1217,   // Scanning

  269,    // Rigging
  278,    // Social
  258,    // Fleet Support
  266,    // Coporation Management
  274,    // Trade
  1220,   // Neural Enhancement

  268,    // Production
  270,    // Science
  1218,   // Resource Processing
  1241,   // Planet Management
  1545,   // Structure Management
];

function groupifySkills(skills){
  let groupMap = {};
  for (let skill of skills) {
    let groupId = skill.group;
    let group = groupMap[groupId];
    if (!group) {
      group = {
        id: groupId,
        name: skillGroups[groupId],
        skills: [],
      };
      groupMap[groupId] = group;
    }
    group.skills.push(skill);
  }

  // Sort skills by name
  for (let groupId in groupMap) {
    groupMap[groupId].skills.sort(function(a, b) {
      return a.name.localeCompare(b.name);
    });
  }

  // Sort groups by display order
  let groupList = [];
  for (let groupId of GROUP_DISPLAY_ORDER) {
    if (groupMap[groupId]) {
      groupList.push(groupMap[groupId]);
    }
  }

  return groupList;
}

</script>

<style scoped>
.root {
  font-weight: 300;
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

.content {
  flex: 1 1 auto;
}

.section-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 20px 0;
  font-weight: 300;
}

.skills-container {
  width: 800px;
}

.skillgroup-container {
  display: flex;
  flex-wrap: wrap;
}

.skillgroup-title {
  font-size: 14px;
  color: #8d785f;
  margin: 17px 0 11px 0;
}

.skill {
  width: 50%;
  flex: 0 0 auto;
  display: flex;
  align-items: center;
  font-size: 14px;
  margin: 6px 0 6px 0;
}

.skill-pips {
  margin: 0 13px 0 13px;
}
</style>