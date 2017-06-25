<template>
<div class="skills-container">
  <template v-if="canReadSkillQueue">
    <div class="section-title">
      Training queue
    </div>
    <loading-spinner
        ref="queueSpinner"
        display="block"
        size="30px"
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
      <div class="queue-total-container" v-if="queueDuration != null">
        <div class="queue-total">
          <span style="color: #cdcdcd">Total:</span>
          {{ queueDuration }}
        </div>
      </div>
    </template>
  </template>
  <template v-if="canReadSkills">
    <div class="section-title">
      Skills
    </div>
    <loading-spinner
        ref="skillSpinner"
        display="block"
        size="30px"
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
      queueDuration: null,

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

  mounted: function() {
    this.fetchData();
  },

  watch: {
    character: function(value) {
      this.queue = null;
      this.skillMap = null;
      this.skillGroups = null;

      this.fetchData();
    },
  },

  methods: {
    fetchData() {
      let skillPromise;

      if (this.canReadSkills) {
        skillPromise = this.$refs.skillSpinner.observe(
            ajaxer.getSkills(this.characterId),
            response => {
              this.processSkillsData(response.data.skills);
              if (response.data.warning) {
                return {
                  state: 'warning',
                  message: response.data.warning,
                };
              }
            });
      }

      if (this.canReadSkillQueue) {
        this.$refs.queueSpinner.observe(
          Promise.all([
            skillPromise || Promise.resolve(),
            ajaxer.getSkillQueue(this.characterId),
          ]),
          ([skillResponse, queueResponse]) => {
            this.queue = queueResponse.data.queue;
            this.queueDuration = queueResponse.data.queueDurationLabel;
            this.maybeInjectQueueDataIntoSkillsMap();

            if (queueResponse.data.dataStatus != 'fresh') {
              return {
                state: 'warning',
                message: 'Skill queue may be out of date',
              };
            }
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

.queue-total-container {
  height: 35px;
  display: flex;
  flex-direction: row;
  justify-content: flex-end;
  align-items: center;
  margin-bottom: -35px;
}

.queue-total {
  color: #8a8a8a;
  font-size: 14px;
  margin-right: 13px;
}
</style>
