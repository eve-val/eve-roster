<template>
  <div class="skills-container">
    <template v-if="canReadSkills">
      <loading-spinner ref="spinner" display="block" size="30px" />

      <template v-if="queue != null">
        <div class="section-title">Training queue</div>
        <div v-if="queue.entries.length == 0" class="empty-queue">
          Skill queue is empty
        </div>
        <template v-else>
          <queue-entry
            v-for="(queueEntry, i) in queue.entries"
            :key="i"
            :entry="queueEntry"
            :position="i"
          />
          <div v-if="queue.durationLabel != null" class="queue-total-container">
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
          <div class="skillgroup-title">
            {{ skillGroup.name }}
          </div>
          <div class="skillgroup-container">
            <div
              v-for="skill in skillGroup.skills"
              :key="skill.id"
              class="skill"
            >
              <skill-pips
                class="skill-pips"
                :trained-level="skill.level"
                :queued-level="skill.queuedLevel || 0"
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
import ajaxer from "../shared/ajaxer";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import QueueEntry from "./QueueEntry.vue";
import SkillPips from "./SkillPips.vue";
import { groupifySkills } from "./skills";

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

  data: function () {
    return {
      queue: null,
      skillGroups: null,
    };
  },

  computed: {
    canReadSkillQueue: function () {
      return this.access != null && this.access["characterSkillQueue"] >= 1;
    },

    canReadSkills: function () {
      return this.access != null && this.access["characterSkills"] >= 1;
    },
  },

  watch: {
    character: function (_value) {
      this.queue = null;
      this.skillGroups = null;

      this.fetchData();
    },
  },

  mounted: function () {
    this.fetchData();
  },

  methods: {
    fetchData() {
      if (this.canReadSkills) {
        this.$refs.spinner.observe(
          ajaxer.getSkills(this.characterId),
          (response) => {
            this.processData(response.data);
            if (response.data.warning) {
              return { state: "warning", message: response.data.warning };
            }
          }
        );
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
  },
};
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
