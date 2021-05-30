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
              :disabled="transferCharacterPromise"
              @click="transferCharacter"
            >
              Transfer character</button
            ><!--
        --><button
              class="roster-btn secondary confirm-deny-btn"
              :disabled="transferCharacterPromise"
              @click="cancelTransfer"
            >
              Cancel
            </button>
          </div>
        </div>
      </div>
      <!-- end body -->
      <loading-spinner
        ref="spinner"
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

import { defineComponent, ref } from "vue";
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

  setup: () => {
    const spinner = ref<InstanceType<typeof LoadingSpinner>>();
    return { spinner };
  },

  data: function () {
    return { transferCharacterPromise: null };
  },

  methods: {
    transferCharacter() {
      this.spinner.value
        ?.observe(
          ajaxer.postCharacterTransfer(this.accountId, this.characterId)
        )
        .then(() => {
          this.$emit("requireRefresh", this.characterId);
          this.transferCharacterPromise = null;
        });
    },

    cancelTransfer() {
      this.spinner.value
        ?.observe(
          ajaxer.deleteCharacterTransfer(this.accountId, this.characterId)
        )
        .then(() => {
          this.$emit("requireRefresh", this.characterId);
          this.transferCharacterPromise = null;
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
