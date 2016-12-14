<template>
<div class="root">
  <div v-for="skillGroup in skills"
      class="skill-group"
      >
    <div class="group-heading">{{ skillGroup.name }}</div>
    <div v-for="skill in skillGroup.skills"
        v-if="skill.level != -1 || showAllSkills"
        class="skill-row" >
      <div class="pips-container">
        <div v-for="n in 5"
            class="pip"
            :class="{ full: n <= skill.level }"
            ></div>
      </div><span class="skill-name">{{ skill.name }}</span>
    </div>
  </div>
</div>
</template>

<script>

export default {
  props: {
    skills: { type: Array, required: true },
  },

  data: function() {
    return {
      showAllSkills: true,
    }
  }
}
</script>

<style scoped>
.root {
  margin-left: 20px;
  margin-top: 15px;
}

.skill-group {
  width: 800px;
  font-size: 14px;
}

.group-heading {
  margin-top: 25px;
  margin-bottom: 15px;
  font-size: 16px;
}

.skill-row {
  display: inline-block;
  width: 50%;
}

.pips-container {
  display: inline-flex;
}

.pip {
  width: 11px;
  height: 11px;
  background: #DDD;
  margin-bottom: 13px;
}

.pip + .pip {
  margin-left: 2px;
}

.pip.full {
  background: #333;
}

.skill-name {
  margin-left: 8px;
}
</style>