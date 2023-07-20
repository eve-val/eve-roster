<template>
  <div class="skills-container">
    <template v-if="canReadSkills">
      <loading-spinner :promise="promise" display="block" size="30px" />

      <template v-if="queue != null">
        <div class="section-titletext">Training queue</div>
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

      <template v-if="displaySkillTree.length > 0">
        <div
          class="section-title skills-title"
          @mouseenter="allSkillsToggleVisible = true"
          @mouseleave="allSkillsToggleVisible = false"
        >
          Skills
          <transition name="skills-toggle">
            <tool-tip
              v-if="allSkillsToggleVisible"
              class="all-skills-toggle-container"
              gravity="right"
            >
              <button
                class="all-skills-toggle"
                :style="skillToggleButtonStyle"
                @click="showAllSkills = !showAllSkills"
              ></button>
              <template #message>
                {{
                  showAllSkills
                    ? "Showing all skills"
                    : "Hiding untrained skills"
                }}
              </template>
            </tool-tip>
          </transition>
        </div>

        <div v-for="skillGroup in displaySkillTree" :key="skillGroup.id">
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
                :queued-level="skill.queuedLevel ?? 0"
              />
              {{ skill.name }}
            </div>
          </div>
        </div>
      </template>
    </template>
  </div>
</template>

<script lang="ts">
import { CSSProperties, defineComponent, PropType, shallowRef } from "vue";

import LoadingSpinner from "../shared/LoadingSpinner.vue";
import ToolTip from "../shared/ToolTip.vue";
import QueueEntry from "./QueueEntry.vue";
import SkillPips from "./SkillPips.vue";

import ajaxer from "../shared/ajaxer";
import { Skill, QueueItem, groupifySkills } from "./skills";
import { SimpleMap } from "../../shared/util/simpleTypes";
import { Character_Skills_GET } from "../../shared/route/api/character/skills_GET";

import rocketIconStroke from "./SkillSheet_rocket_launch_stroke.svg";
import rocketIconFill from "./SkillSheet_rocket_launch_fill.svg";

export default defineComponent({
  components: {
    LoadingSpinner,
    QueueEntry,
    SkillPips,
    ToolTip,
  },

  props: {
    characterId: { type: Number, required: true },
    access: { type: Object as PropType<SimpleMap<number>>, required: true },
  },

  setup() {
    const rawSkills = shallowRef(new Map<number, Skill>());

    return {
      rawSkills,
    };
  },

  data() {
    return {
      queue: null as Character_Skills_GET["queue"] | null,
      promise: null as Promise<any> | null,
      showAllSkills: true,
      allSkillsToggleVisible: false,
    };
  },

  computed: {
    canReadSkillQueue: function (): boolean {
      return this.access != null && this.access.characterSkillQueue >= 1;
    },

    canReadSkills: function (): boolean {
      return this.access != null && this.access.characterSkills >= 1;
    },

    displaySkillTree() {
      const skills = [] as Skill[];
      for (const skill of this.rawSkills.values()) {
        if (skill.level > 0 || this.showAllSkills) {
          skills.push(skill);
        }
      }
      return groupifySkills(skills);
    },

    skillToggleButtonStyle() {
      const style = {} as CSSProperties;

      if (this.showAllSkills) {
        style.backgroundImage = `url(${rocketIconFill})`;
      } else {
        style.backgroundImage = `url(${rocketIconStroke})`;
      }

      return style;
    },
  },

  watch: {
    characterId: function (_value: number) {
      this.queue = null;
      this.rawSkills = new Map<number, Skill>();

      this.fetchData();
    },
  },

  mounted() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      if (this.canReadSkills) {
        const promise = ajaxer.getSkills(this.characterId);
        this.promise = promise;
        promise.then((response) => {
          this.processData(response.data);
        });
      }
    },

    processData(data: Character_Skills_GET) {
      const newSkillMap = new Map<number, Skill>();

      // Process skills
      for (let jsonSkill of data.skills) {
        newSkillMap.set(jsonSkill.id, {
          id: jsonSkill.id,
          name: jsonSkill.name,
          group: jsonSkill.group,
          level: jsonSkill.level,
          sp: jsonSkill.sp,
          queuedLevel: 0,
        });
      }
      this.rawSkills = newSkillMap;

      // Process queue
      if (data.queue != undefined) {
        const queueItems = data.queue.entries.map((qiJson) => {
          let skill = newSkillMap.get(qiJson.id) ?? unknownSkill();

          const queueItem: QueueItem = {
            ...qiJson,
            skill: skill,
          };

          skill.queuedLevel = queueItem.targetLevel;

          return queueItem;
        });

        this.queue = {
          ...data.queue,
          entries: queueItems,
        };
      }
    },
  },
});

function unknownSkill(): Skill {
  return {
    id: 0,
    group: 0,
    level: 0,
    name: "Unknown Skill",
    sp: 0,
    queuedLevel: 0,
  };
}
</script>

<style scoped>
.section-title {
  font-size: 20px;
  color: #a7a29c;
  margin: 40px 0 20px 0;
  font-weight: 300;
}

.skills-title {
  display: flex;
  flex-direction: row;
  align-items: baseline;
}

.all-skills-toggle-container {
  margin-left: 10px;
}

.all-skills-toggle {
  width: 17px;
  height: 17px;
  padding: 0;
  background-color: transparent;
  border: none;
  background-size: contain;
  cursor: pointer;
}

._loading-spinner + .section-title {
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

.skills-toggle-enter-active,
.skills-toggle-leave-active {
  transition: opacity 250ms cubic-bezier(0.33, 1, 0.68, 1);
}

.skills-toggle-enter-from,
.skills-toggle-leave-to {
  opacity: 0;
}
</style>
