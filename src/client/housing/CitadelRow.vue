<template>
  <div class="row" @mouseenter="$emit('hover')" @mouseleave="$emit('unhover')">
    <div>({{ row.occupants.length }}) {{ row.name }}</div>
    <div v-for="character in row.occupants" :key="character.characterId">
      <member-chip
        :key="character.characterId"
        :character="character"
        @chipDrag="$emit('chipDrag', ...arguments)"
      />
    </div>
  </div>
</template>

<script lang="ts">
import MemberChip from "./MemberChip.vue";

import { defineComponent } from "vue";
export default defineComponent({
  components: {
    MemberChip,
  },

  props: {
    row: { type: Object, required: true },
  },

  emits: ["hover", "unhover", "chipDrag"],
});
</script>

<style scoped>
.row {
  width: 200px;
  padding: 10px;
}
</style>
