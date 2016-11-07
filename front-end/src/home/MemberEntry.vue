<template>
  <div class="roster-member-entry">
    <roster-line :row="row" :is-main="true" />
    <roster-line v-for="alt in row.alts" :row="alt" :is-main="false" />
  </div>
</template>

<script>
import RosterLine from './RosterLine.vue';

export default {
  props: {
    row: {
      type: Object,
      required: true,
    }
  },

  components: {
    RosterLine,
  }
}
</script>

<style>
.roster-member-entry {
  
}
</style>