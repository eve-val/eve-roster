<template>
  <admin-wrapper title="Account log" :identity="identity">
    <div v-if="rows" class="table">
      <div class="headers">
        <div class="cell timestamp">Timestamp</div>
        <div class="cell account">Account</div>
        <div class="cell event">Event</div>
        <div class="cell related-char">Character involved</div>
        <div class="cell data">Data</div>
      </div>
      <div class="rows">
        <div v-for="row in rows" :key="row.id" class="row">
          <div class="cell timestamp">
            {{ displayDate(row.timestamp) }}
          </div>
          <div class="cell account">
            <span
              v-if="row.originalAccount != row.accountId"
              class="original-account"
            >
              {{ row.originalAccount }} &rightarrow;
            </span>
            {{ row.accountId }}
            <span class="main-character">/ {{ row.mainCharacter }}</span>
          </div>
          <div class="cell event">
            {{ row.event }}
          </div>
          <div class="cell related-char">
            {{ row.relatedCharacterName }}
          </div>
          <div class="data">
            <tool-tip v-if="row.data" gravity="bottom end">
              <template #default>
                <div class="cell">{ ... }</div>
              </template>
              <template #message>
                <pre style="margin: 0">{{ prettyPrint(row.data) }}</pre>
              </template>
            </tool-tip>
          </div>
        </div>
      </div>
      <div class="length-reminder">Showing most recent 200 records</div>
    </div>
    <loading-spinner :promise="promise" display="block" size="34px" />
  </admin-wrapper>
</template>

<script lang="ts">
import moment from "moment";
import { AxiosResponse } from "axios";

import ajaxer from "../shared/ajaxer";

import AdminWrapper from "./AdminWrapper.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";
import ToolTip from "../shared/ToolTip.vue";

import { Identity } from "../home";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AdminWrapper,
    LoadingSpinner,
    ToolTip,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      rows: null,
      promise: null,
    } as {
      rows: any[] | null;
      promise: Promise<AxiosResponse> | null;
    };
  },

  mounted() {
    const promise = ajaxer.getAdminAccountLog();
    this.promise = promise;
    promise.then(
      (response) => {
        let rows = response.data.rows;
        this.rows = rows;
      },
      () => {},
    );
  },

  methods: {
    prettyPrint: function (jsonStr: string): string {
      return JSON.stringify(JSON.parse(jsonStr), null, 2);
    },
    displayDate: function (value: number): string {
      return moment(value).format("Y/MM/DD HH:mm:ss Z");
    },
  },
});
</script>

<style scoped>
.table {
  margin-right: 100px;
  display: inline-block;
}

.headers,
.row {
  font-size: 14px;
  padding: 10px 8px;
}

.headers {
  display: flex;
  color: #a7a29c;
  padding-bottom: 5px;
}

.row:nth-child(even) {
  background-color: #181818;
}

.row:nth-child(odd) {
  background-color: #131313;
}

.row {
  display: flex;
  font-weight: normal;
}

.cell {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}

.timestamp {
  width: 230px;
}

.account {
  width: 220px;
}

.main-character {
  color: #666;
}

.event {
  width: 170px;
}

.related-char {
  width: 200px;
}

.data {
  cursor: default;
  width: 50px;
}

.length-reminder {
  margin-top: 20px;
  font-size: 14px;
  color: #a7a29c;
}
</style>
