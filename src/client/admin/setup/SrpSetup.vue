<!--

Settings UI for SRP tracking. Currently only has one real setting: when
SRP tracking starts, if it does at all.

-->

<template>
  <div
    class="_srp-setup"
    :style="{
      opacity: loaded ? undefined : '0.5',
      'pointer-events': loaded ? undefined : 'none',
    }"
  >
    <div class="left">
      <label><input v-model="trackSrp" type="checkbox" /> Track SRP</label>
      <div
        class="date-picker"
        :style="{ opacity: trackSrp ? undefined : '0.5' }"
      >
        Starting from
        <input
          v-model="startInput"
          class="date-input"
          type="date"
          :disabled="!trackSrp"
        />
      </div>
    </div>
    <div
      class="right"
      :style="{ visibility: dirtyChanges ? 'visible' : 'hidden' }"
    >
      <loading-spinner
        :promise="promise"
        class="spinner"
        display="inline"
        size="30px"
        default-state="hidden"
      />
      <button
        v-if="requestStatus != 'active'"
        class="roster-btn save-btn"
        @click="onSaveClick"
      >
        Save
      </button>
    </div>
  </div>
</template>

<script lang="ts">
import ajaxer from "../../shared/ajaxer";
import LoadingSpinner from "../../shared/LoadingSpinner.vue";

const STATUSES = ["active", "inactive", "error"] as const;
type Status = typeof STATUSES[number];
import { AxiosResponse } from "axios";
import { defineComponent } from "vue";
export default defineComponent({
  components: {
    LoadingSpinner,
  },

  data() {
    return {
      loaded: false,
      trackSrp: false,
      startInput: timestampToDateStr(Date.now()),
      savedState: {
        trackSrp: false,
        startInput: timestampToDateStr(Date.now()),
      },
      requestStatus: "inactive",
      promise: null,
    } as {
      loaded: boolean;
      trackSrp: boolean;
      startInput: string;
      savedState: {
        trackSrp: boolean;
        startInput: string;
      };
      requestStatus: Status;
      promise: Promise<any> | null;
    };
  },

  computed: {
    dirtyChanges(): boolean {
      return (
        this.trackSrp != this.savedState.trackSrp ||
        this.startInput != this.savedState.startInput
      );
    },
  },

  mounted() {
    ajaxer.getAdminSrpJurisdiction().then((response: AxiosResponse) => {
      this.loaded = true;

      const jurisdiction = response.data.srpJurisdiction;
      const trackSrp = jurisdiction != null;
      const startInput = timestampToDateStr(
        (jurisdiction && jurisdiction.start) || Date.now()
      );

      this.savedState = {
        trackSrp: trackSrp,
        startInput: startInput,
      };
      this.trackSrp = trackSrp;
      this.startInput = startInput;
    });
  },

  methods: {
    onSaveClick() {
      const trackSrp = this.trackSrp;
      const startInput = this.startInput;

      let timestamp = null;
      if (trackSrp && startInput != "") {
        timestamp = Date.parse(startInput);
        if (isNaN(timestamp)) {
          this.promise = Promise.resolve().then(() => {
            throw new Error(`Invalid date format.`);
          });
          return;
        }
      }
      if (timestamp == null) {
        return;
      }

      this.requestStatus = "active";
      const promise = ajaxer.putAdminSrpJurisdiction(timestamp);
      this.promise = promise;
      promise
        .then(() => {
          this.savedState.trackSrp = trackSrp;
          this.savedState.startInput = startInput;
          this.requestStatus = "inactive";
        })
        .catch((e: Error) => {
          this.requestStatus = "error";
          throw e;
        });
    },
  },
});

function timestampToDateStr(timestamp: number) {
  const date = new Date(timestamp);
  return (
    date.getUTCFullYear() +
    "-" +
    (date.getUTCMonth() + 1).toString().padStart(2, "0") +
    "-" +
    date.getUTCDate().toString().padStart(2, "0")
  );
}
</script>

<style scoped>
._srp-setup {
  display: flex;
  width: 738px;
  font-size: 14px;
}

.left {
  flex: 1;
}

.right {
  display: flex;
  width: 200px;
  align-items: center;
  justify-content: flex-end;
}

.date-picker {
  margin-top: 10px;
  margin-left: 20px;
  padding: 20px;
  width: 300px;
  background: #1b1b1b;
}

.date-input {
  font-size: 16px;
  margin-left: 5px;
}

.save-btn {
  width: 115px;
  height: 38px;
  font-size: 14px;
}
</style>
