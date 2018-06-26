<!--

Displays the sync status of a particular member corporation, including
who the directors are and which of them we have tokens for.

-->

<template>
<div class="_member-corp-detail">
  <div class="title-bar">
    <eve-image
        class="icon"
        :id="corp.id"
        type="Corporation"
        :size="40"
        >
    </eve-image>
    <div class="name">
      {{ name(corp.id) }}
    </div>
  </div>
  <div class="body">
    <div v-if="corp.directors.length > 0" class="director-table">
      <div class="table-headers">
        <div class="header directors">Directors</div>
        <div class="header authtokens">Auth token</div>
      </div>
      <div
          v-for="director in corp.directors"
          class="table-row"
          :key="director.id"
          >
        <div class="director-name">{{ director.name }}</div>
        <div
            class="token-status"
            :style="{ color: !director.canUseToken ? '#FF5F32' : undefined }"
            >
          {{ director.tokenStatusLabel }}
        </div>
      </div>
    </div>
    <div v-else class="login-bother">
      No known directors. Please log in with a director so roster sync can take
      place.
    </div>
  </div>
</div>
</template>

<script>
import Vue from 'vue';
import { NameCacheMixin } from '../../shared/nameCache';
import EveImage from '../../shared/EveImage.vue';


export default Vue.extend({
  components: {
    EveImage,
  },

  props: {
    corp: { type: Object, required: true },
  },

  data() {
    return {
    };
  },

  computed: {
  },

  methods: Object.assign({
  }, NameCacheMixin),
});
</script>

<style scoped>
._member-corp-detail {
  margin-top: 25px;
}

.title-bar {
  display: flex;
  padding: 4px;
  background-color: #363636;
  align-items: center;
  margin-bottom: 17px;
}

.icon {
  background-color: #484848;
}

.name {
  flex: 1;
  margin-left: 10px;
  font-size: 14px;
  font-weight: normal;
}

.body {
  padding-left: 17px;
  font-size: 14px;
  font-weight: normal;
}

.director-table {
  font-size: 14px;
  width: 515px;
}

.table-headers {
  display: flex;
  height: 26px;
  align-items: center;
  padding: 0 9px;
  color: #A7A29C;
}

.table-row {
  display: flex;
  height: 31px;
  align-items: center;
  padding: 0 9px;
  background-color: #131313;
}

.table-row:nth-child(odd) {
  background-color: #181818;
}

.director-name, .header.directors {
  flex: 1;
}

.token-status, .header.authtokens {
  width: 185px;
}

.login-bother {
  font-size: 14px;
  padding: 7px 9px;
  background-color: #131313;
  width: 515px;
  box-sizing: border-box;
}

</style>
