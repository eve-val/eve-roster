<template>
<div class="skills-container">
  <template v-if="canReadSkillQueue">
    <div class="section-title">
      Training queue
    </div>
    <loading-spinner
        v-if="queueStatus != 'loaded'"
        :message="queueMessage"
        :size="30"
        messageMode="text"
        :promise="queuePromise"
        />
    <div class="empty-queue" v-if="queueStatus == 'loaded' && queue == null">
      Skill queue is empty
    </div>
    <template v-if="queue && skillGroups">
      <queue-entry v-for="(queueItem, i) in queue"
          :key="i"
          :skill="skillMap[queueItem.id]"
          :queueData="queueItem"
          :position="i"
          />
    </template>
  </template>
  <template v-if="canReadSkills">
    <div class="section-title">
      Skills
    </div>
    <loading-spinner
        v-if="skillStatus != 'loaded'"
        :message="skillMessage"
        :size="30"
        messageMode="text"
        :promise="skillPromise"
        />
    <template v-if="skillGroups">
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
  </template>
</div>
</template>

<script>
import skillGroups from '../../data/skill-groups.js'

import ajaxer from '../shared/ajaxer';
import LoadingSpinner from '../shared/LoadingSpinner.vue';

import QueueEntry from './QueueEntry.vue';
import SkillPips from './SkillPips.vue';

export default {
  components: {
    LoadingSpinner,

    SkillPips,
    QueueEntry,
  },

  props: {
    characterId: { type: Number, required: true },
    access: { type: Object, required: true },
  },

  data: function() {
    return {
      queue: null,
      skillMap: null,
      skillGroups: null,

      queueStatus: null,
      skillStatus: null,

      queueMessage: null,
      skillMessage: null,
    };
  },

  computed: {
    canReadSkillQueue: function() {
      return this.access != null && this.access['characterSkillQueue'] >= 1;
    },

    canReadSkills: function() {
      return this.access != null && this.access['characterSkills'] >= 1;
    },
  },

  created: function() {
    this.fetchData();
  },

  watch: {
    character: function(value) {
      console.log('Changed!', value);
      this.queue = null;
      this.skillMap = null;
      this.skillGroups = null;

      this.queueStatus = null;
      this.skillStatus = null;
      this.queueMessage = null;
      this.skillMessage = null;

      this.fetchData();
    },
  },

  methods: {
    fetchData() {
      if (this.canReadSkills) {
        this.skillStatus = 'loading';
        this.skillPromise = ajaxer.getSkills(this.characterId)
          .then(response => {
            this.skillMessage = response.data.warning;
            this.skillStatus = this.skillMessage ? 'loaded-warning' : 'loaded';
            this.processSkillsData(response.data.skills);
          })
          .catch(e => {
            this.skillStatus = 'error';
            // Let the loading spinner catch the error
            throw e;
          });
      }

      if (this.canReadSkillQueue) {
        this.queueStatus = 'loading';
        this.queuePromise = Promise.all([
          this.skillPromise,
          ajaxer.getSkillQueue(this.characterId),
        ])
        .then(([skillResponse, queueResponse]) => {
          this.queue = queueResponse.data.queue;
          this.maybeInjectQueueDataIntoSkillsMap();
          this.queueMessage = queueResponse.data.warning;
          this.queueStatus = this.queueMessage ? 'loaded-warning' : 'loaded';
        })
        .catch(e => {
          this.queueStatus = 'error';
          // Let the loading spinner catch the error
          throw e;
        });
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
.section-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 20px 0;
  font-weight: 300;
}

.section-title:first-child {
  margin-top: 0px;
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

.empty-queue {
  font-size: 14px;
  padding: 10px 0px 9px 13px;
}
</style>
