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
import _ from 'underscore';

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
  { groupId: 257, name: 'Spaceship Command' },
  { groupId: 275, name: 'Navigation' },
  { groupId: 1216, name: 'Engineering' },
  { groupId: 1240, name: 'Subsystems' },
  { groupId: 1210, name: 'Armor' },
  { groupId: 1209, name: 'Shields' },

  { groupId: 1213, name: 'Targeting' },
  { groupId: 255, name: 'Gunnery' },
  { groupId: 256, name: 'Missiles' },
  { groupId: 273, name: 'Drones' },
  { groupId: 272, name: 'Electronic Systems' },
  { groupId: 1217, name: 'Scanning' },

  { groupId: 269, name: 'Rigging' },
  { groupId: 278, name: 'Social' },
  { groupId: 258, name: 'Fleet Support' },
  { groupId: 266, name: 'Corporation Management' },
  { groupId: 274, name: 'Trade' },
  { groupId: 1220, name: 'Neural Enhancement' },

  { groupId: 268, name: 'Production' },
  { groupId: 270, name: 'Science' },
  { groupId: 1218, name: 'Resource Processing' },
  { groupId: 1241, name: 'Planet Management' },
  { groupId: 1545, name: 'Structure Management' },
];

const GROUP_DISPLAY_MAP = {};
for (let i = 0; i < GROUP_DISPLAY_ORDER.length; i++) {
  let group = GROUP_DISPLAY_ORDER[i];
  GROUP_DISPLAY_MAP[group.groupId] = {
    name: group.name,
    position: i,
  }
}

/**
 * Groups the character's skills into their associated skill groups,
 * e.g. 'Engineering'. Sorts the groups based on the ordering provided in
 * GROUP_DISPLAY_ORDER.
 */
function groupifySkills(skills) {
  let skillGroupMap = _.groupBy(skills, 'group');
  
  let skillGroups = [];
  for (let groupId in skillGroupMap) {
    let skills = skillGroupMap[groupId];

    // Sort skills by name
    skills.sort((a, b) => a.name.localeCompare(b.name));

    // Attach group name and sort position
    let groupDescriptor = GROUP_DISPLAY_MAP[groupId];
    if (groupDescriptor == undefined) {
      let fallbackName = groupId == 'null' ? 'unknown' : groupId;
      groupDescriptor = {
        name: `Skill group ${fallbackName}`,
        position: GROUP_DISPLAY_ORDER.length,
      };
    }

    skillGroups.push({
      name: groupDescriptor.name,
      position: groupDescriptor.position,
      skills: skills,
    });
  }

  // Sort groups by position
  skillGroups.sort((a, b) => {
    if (a.position > b.position) {
      return 1;
    } else if (b.position > a.position) {
      return -1;
    } else {
      // Unknown groups will all have the same position; sort them by name
      return a.name.localeCompare(b.name);
    }
  });

  return skillGroups;
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
