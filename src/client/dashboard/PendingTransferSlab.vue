<template>
<div class="slab-root">
  <div class="slab-main">
    <eve-image :id="character" :size="105" type="Character" />
    <div class="body">
      <div>
        <router-link
            class="name"
            :to="'/character/' + character"
            >{{ name }}</router-link>
        <div class="mt7">
          Are you sure you want to transfer this character to this account?
          <div class="mt7">
            <button @click="transferCharacter()">Yes</button>
            <button @click="cancelTransfer()">No</button>
          </div>
        </div>
      </div>
    </div>
  </div>
</div>
</template>

<script>
import ajaxer from '../shared/ajaxer';

import EveImage from '../shared/EveImage.vue';

export default {
  components: { EveImage },

  props: {
    accountId: { type: Number, required: true, },
    character: { type: Number, required: true },
    name: {type: String, required: true },
  },

  data: function() {
    return { transferCharacterPromise: null };
  },

  methods: {
    transferCharacter() {
      this.transferCharacterPromise = ajaxer
      .putTransferCharacter(this.accountId, this.character)
      .then(() => {
        // TODO(wfurr): emitRefresh might not work since this isn't a real character slab
        this.$emit('requireRefresh', this.character.id);
        this.transferCharacterPromise = null;
      });
    },

    cancelTransfer() {
      // TODO(wfurr): Add endpoint to delete character transfer request
    }
  },
}
</script>

<style scoped>
.slab-root {
  width: 480px;
}

.slab-main {
  border: 1px solid #2d2318;
  background: #101010;
  height: 105px;
  display: flex;
  position: relative;
  user-select: none;
  cursor: default;

  transition: box-shadow 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.slab-main:hover {
  /*box-shadow: 0 0 8px rgba(255, 255, 255, 0.05);*/
  border-color: #352d24;
}

.body {
  padding: 11px 10px 0 10px;
}

.name {
  font-size: 16px;
  color: #cdcdcd;
  text-decoration: none;
  margin-right: 5px;
}

.name:hover {
  text-decoration: underline;
}

.name:active {
  color: #aaa;
}

.mt7 {
  margin-top: 7px;
}

.slab-main button {
  width: 50px;
  margin-right: 20px;
}
</style>
