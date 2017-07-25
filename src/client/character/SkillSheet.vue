<template>
<div class="skills-container">
  <template v-if="canReadSkills">
    <loading-spinner
        ref="spinner"
        display="block"
        size="30px"
        />

    <template v-if="queue != null">
      <div class="section-title">Training queue</div>
      <div class="empty-queue" v-if="queue.entries.length == 0">
        Skill queue is empty
      </div>
      <template v-else>
        <queue-entry v-for="(queueEntry, i) in queue.entries"
            :key="i"
            :entry="queueEntry"
            :position="i"
            />
        <div class="queue-total-container" v-if="queue.durationLabel != null">
          <div class="queue-total">
            <span style="color: #cdcdcd">Total:</span>
            {{ queue.durationLabel }}
          </div>
        </div>
      </template>
    </template>

    <template v-if="skillGroups != null">
      <div class="section-title">Skills</div>
      <div v-for="skillGroup in skillGroups" :key="skillGroup.id">
        <div class="skillgroup-title">{{ skillGroup.name }}</div>
        <div class="skillgroup-container">
          <div v-for="skill in skillGroup.skills"
              class="skill"
              :key="skill.id"
              >
            <skill-pips class="skill-pips"
                :trainedLevel="skill.level"
                :queuedLevel="skill.queuedLevel || 0"
                />
            {{ skill.name }}
          </div>
        </div>
      </div>
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
      skillGroups: null,
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
      this.skillGroups = null;

      this.fetchData();
    },
  },

  methods: {
    fetchData() {
      if (this.canReadSkills) {
        this.$refs.spinner.observe(
            ajaxer.getSkills(this.characterId),
            response => {
              this.processData(response.data);
              if (response.data.warning) {
                return { state: 'warning', message: response.data.warning };
              }
            });
      }
    },

    processData({ skills, queue }) {
      let skillMap = {};
      for (let skill of skills) {
        skillMap[skill.id] = skill;
        skill.queuedLevel = null;
      }
      this.skillGroups = groupifySkills(skills);

      if (queue != undefined) {
        this.queue = queue;
        for (let qe of queue.entries) {
          let skill = skillMap[qe.id];
          skill.queuedLevel = qe.targetLevel;
          qe.skill = skill;
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
