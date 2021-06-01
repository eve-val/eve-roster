<template>
  <character-slab-frame :character-id="characterId">
    <div class="_pending-transfer-slab">
      <div class="body">
        <div>
          <router-link class="name" :to="'/character/' + characterId">
            {{ name }}
          </router-link>
          <div class="prompt">
            This character is owned by another account. Are you sure?
          </div>
          <div>
            <button
              class="roster-btn confirm-deny-btn"
              :disabled="promise"
              @click="transferCharacter"
            >
              Transfer character</button
            ><!--
        --><button
              class="roster-btn secondary confirm-deny-btn"
              :disabled="promise"
              @click="cancelTransfer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      <!-- end body -->
      <loading-spinner
        :promise="promise"
        class="transfer-character-spinner"
        default-state="hidden"
        size="20px"
        tooltip-gravity="left center"
        action-label="transferring this character to you"
      />
    </div>
    <!-- end _pending-transfer-slab -->
  </character-slab-frame>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";

import CharacterSlabFrame from "./CharacterSlabFrame.vue";
import LoadingSpinner from "../shared/LoadingSpinner.vue";

import { defineComponent } from "vue";
export default defineComponent({
  components: {
    CharacterSlabFrame,
    LoadingSpinner,
  },

  props: {
    accountId: { type: Number, required: true },
    characterId: { type: Number, required: true },
    name: { type: String, required: true },
  },

  emits: ["requireRefresh"],

  data() {
    return {
      promise: null,
    } as {
      promise: Promise<any> | null;
    };
  },

  methods: {
    transferCharacter() {
      const promise = ajaxer.postCharacterTransfer(
        this.accountId,
        this.characterId
      );
      this.promise = promise;
      promise.then(() => {
        this.$emit("requireRefresh", this.characterId);
        this.promise = null;
      });
    },

    cancelTransfer() {
      const promise = ajaxer.deleteCharacterTransfer(
        this.accountId,
        this.characterId
      );
      this.promise = promise;
      promise.then(() => {
        this.$emit("requireRefresh", this.characterId);
        this.promise = null;
      });
    },
  },
});
</script>

<style scoped>
.name {
  font-size: 16px;
  color: #cdcdcd;
  text-decoration: none;
  margin-right: 5px;
}

.body {
  padding: 11px 10px 0 10px;
}

.name:hover {
  text-decoration: underline;
}

.name:active {
  color: #aaa;
}

.prompt {
  color: #a7a29c;
  display: flex;
  height: 40px;
  flex-direction: row;
  align-items: center;
  position: relative;
  top: -1px;
}

.confirm-deny-btn {
  font-size: 12px;
  height: 26px;
  margin-right: 7px;
}

.transfer-character-spinner {
  position: absolute;
  bottom: 3px;
  left: 167px;
}
</style>
