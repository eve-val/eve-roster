<template>
<div class="row"
    @mouseenter="emitEvent('hover')"
    @mouseleave="emitEvent('unhover')">
  <div class="cell-citadel">
    <div>{{ row.name }}</div>
    <div>
      <member-chip v-for="character in row.occupants"
        :character="character"
        :bus="bus"
        />
    </div>
  </div>
  <div class="cell-size">{{ row.occupants.length }}</div>
</div>
</template>

<script>

import MemberChip from './MemberChip.vue';

export default {
  components: {
    MemberChip,
  },

  props: {
    row: { type: Object, required: true },
    bus: { type: Object, required: true },
  },

  methods: {
    emitEvent: function(type) {
      this.bus.$emit(type, this);
    }
  },
}

</script>

<style scoped>
.row {
  display: flex;
  margin: 10px 0;
}

.cell-citadel {
  flex-grow: 1;
}

.cell-size {
  flex: 0 0 50px;
  text-align: right;
}

</style>