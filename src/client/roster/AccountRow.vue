<template>
  <div class="accountRow" v-show="filterMatches.any || filterMatches.inactive">
    <character-row
      :character="expanded ? account.main : account.aggregate"
      :columns="columns"
      :isMain="true"
      :account="account"
      :filter="filter"
      class="main-row"
      :style="{
        background: expanded ? '#353331' : undefined,
      }"
      @toggleExpanded="clickExpanded = !clickExpanded"
    />
    <transition
      name="alts-expand"
      @before-enter="beforeEnter"
      @enter="enter"
      @after-enter="afterEnter"
      @before-leave="beforeLeave"
      @leave="leave"
      @after-leave="afterLeave"
      :css="false"
    >
      <div
        class="alt-cnt"
        v-show="expanded"
        :style="{
          'background-color': expanded ? '#2D2B29' : '#202020',
        }"
      >
        <character-row
          v-for="alt in account.alts"
          :key="alt.id"
          :character="alt"
          :columns="columns"
          :isMain="false"
          :filter="filter"
        />
      </div>
    </transition>
  </div>
</template>

<script>
import filter from "./filter";
import CharacterRow from "./CharacterRow.vue";

export default {
  components: {
    CharacterRow,
  },

  props: {
    columns: { type: Array, required: true },
    account: { type: Object, required: true },
    filter: { type: String, required: false },
  },

  data: function () {
    return {
      clickExpanded: false,
    };
  },

  computed: {
    expanded: function () {
      return this.clickExpanded || this.filterMatches.alt;
    },

    filterMatches: function () {
      let matches = {
        inactive: this.filter == null || this.filter == "",
        any: false,
        main: false,
        alt: false,
      };
      if (filter.matchIndex(this.account.main.name, this.filter) != -1) {
        matches.main = true;
      }
      for (let alt of this.account.alts) {
        if (filter.matchIndex(alt.name, this.filter) != -1) {
          matches.alt = true;
          break;
        }
      }
      matches.any = matches.main || matches.alt;

      return matches;
    },
  },

  methods: {
    beforeEnter: function (el) {
      let oldDisplay = el.style.display;
      el.style.display = "block";
      el.style.height = "auto";
      this.absHeight = el.offsetHeight;
      el.style.display = oldDisplay;
      el.style.height = "0";
    },

    enter: function (el, done) {
      // I don't understand why this setTimeout call is necessary
      setTimeout(() => {
        el.style.height = this.absHeight + "px";
        // TODO: actually listen for css transitionend event
        setTimeout(() => {
          done();
        }, 300);
      });
    },

    afterEnter: function (el) {
      el.style.height = "auto";
    },

    beforeLeave: function (el) {
      el.style.height = el.offsetHeight + "px";
    },

    leave: function (el, done) {
      setTimeout(() => {
        el.style.height = "0";
        // TODO: actually listen for css transitionend event
        setTimeout(() => {
          done();
        }, 250);
      });
    },

    afterLeave: function (el) {
      el.style.height = "auto";
    },
  },
};
</script>

<style scoped>
.accountRow {
  border-bottom: 1px solid #312c24;
}

.main-row {
  transition: background-color 300ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.alt-cnt {
  overflow: hidden;
  transition-property: height, background-color;
  transition-duration: 250ms;
  transition-timing-function: cubic-bezier(0.215, 0.61, 0.355, 1);
}
</style>
