<template>
  <div
    class="row"
    @mouseenter="emitEvent('hover')"
    @mouseleave="emitEvent('unhover')"
  >
    <div>({{ row.occupants.length }}) {{ row.name }}</div>
    <div v-for="character in row.occupants">
      <member-chip
        :key="character.characterId"
        :character="character"
        :bus="bus"
      />
    </div>
  </div>
</template>

<script>
import MemberChip from "./MemberChip.vue";

export default {
  components: {
    MemberChip,
  },

  props: {
    row: { type: Object, required: true },
    bus: { type: Object, required: true },
  },

  methods: {
    emitEvent: function (type) {
      this.bus.$emit(type, this);
    },
  },
};
</script>

<style scoped>
.row {
  width: 200px;
  padding: 10px;
}
</style>
