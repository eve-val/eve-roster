<template>
<div class="_dev-owned-character-slap">

  <div class="entry-title">Basic main</div>
  <owned-character-slab
      :accountId="0"
      :character="characterBasic"
      :isMain="true"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      :isPuppet="true"
      />

  <div class="entry-title">Basic alt</div>
  <owned-character-slab
      :accountId="0"
      :character="characterBasic"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      :isPuppet="true"
      />

  <div class="entry-title">Opsec alt</div>
  <owned-character-slab
      :accountId="0"
      :character="characterOpsecAlt"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      :isPuppet="true"
      />
  
  <div class="entry-title">Action pending</div>
  <owned-character-slab
      ref="actionPendingSlab"
      :accountId="0"
      :character="characterBasic"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      :isPuppet="true"
      />

  <div class="entry-title">Action failed</div>
  <owned-character-slab
      ref="actionFailedSlab"
      :accountId="0"
      :character="characterBasic"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      :isPuppet="true"
      />
</div>
</template>

<script>
import OwnedCharacterSlab from '../dashboard/OwnedCharacterSlab.vue'

export default {
  components: {
    OwnedCharacterSlab,
  },

  data() {
    return {
      characterBasic: {
        id: 95773199,
        name: 'Brienne Lesqagar',
        needsReauth: false,
        opsec: false,
        corpStatus: 'primary',
      },

      characterOpsecAlt: {
        id: 95773199,
        name: 'Brienne Lesqagar',
        needsReauth: false,
        opsec: true,
        corpStatus: 'external',
      },

      accessFull: {
        isMember: true,
        designateMain: 2,
      },

      loginParams: 'foo=bar&baz=pizza'
    };
  },

  mounted() {
    this.$refs.actionPendingSlab.$refs.spinner.observe(pendingPromise());
    this.$refs.actionFailedSlab.$refs.spinner.observe(errorPromise());
  },
}

function pendingPromise() {
  return new Promise(() => {});
}

function errorPromise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject('A terrible error has occurred.');
    }, 1000);
  });
}

</script>

<style scoped>
.entry-title {
  margin: 30px 0 10px 0;
}
</style>
