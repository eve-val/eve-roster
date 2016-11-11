<template>
  <div class="member-entry" @mousedown.prevent @click="onClick" >
    <roster-line :row="row.aggregate" :is-main="true" />
    <div v-if="expanded && row.alts.length > 0" class="alt-drawer">
      <roster-line v-for="alt in row.alts" :row="alt" :is-main="false" />
    </div>
  </div>
</template>

<script>
import CharacterPortrait from './CharacterPortrait.vue'
import RosterLine from './RosterLine.vue';

export default {
  props: {
    row: {
      type: Object,
      required: true,
    }
  },

  data: function() {
    return {
      expanded: false
    }
  },

  methods: {
    onClick: function(ev) {
      if (this.row.alts.length > 0) {
        this.expanded = !this.expanded;
        ev.preventDefault();
        ev.stopPropagation();
      }
    }
  },

  components: {
    CharacterPortrait,
    RosterLine,
  }
}
</script>

<style scoped>
.member-entry {
  padding: 6px 0 6px 0;
  border-top: 1px solid #EEE;
}

.alt-drawer {
  padding-top: 2px;
}
</style>