<template>
<div class="_dev-owned-character-slap">

  <div class="entry-title">Main</div>
  <owned-character-slab
      :accountId="0"
      :character="characterBasic"
      :isMain="true"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      />

  <div class="entry-title">Alt</div>
  <owned-character-slab
      :accountId="0"
      :character="characterBasic"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      />

  <div class="entry-title">Opsec alt</div>
  <owned-character-slab
      :accountId="0"
      :character="characterOpsecAlt"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      />
  
  <!-- Skill queue variations -->
  <div class="section">Skill queue variations</div>

  <div class="entry-title">Empty queue</div>
  <owned-character-slab
      :accountId="0"
      :character="characterEmptyQueue"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      />

  <div class="entry-title">Paused queue</div>
  <owned-character-slab
      :accountId="0"
      :character="characterPausedQueue"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      />


  <!-- Action handling -->
  <div class="section">Action handling</div>

  <div class="entry-title">Action pending</div>
  <owned-character-slab
      ref="actionPendingSlab"
      :accountId="0"
      :character="characterBasic"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
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
      />
  
  <div class="entry-title">ESI error</div>
  <owned-character-slab
      :accountId="0"
      :character="characterUnfresQueue"
      :isMain="true"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
      />

  <!-- Misc -->
  <div class="section">Misc</div>

  <div class="entry-title">Needs reauth (needs rework)</div>
  <owned-character-slab
      :accountId="0"
      :character="characterNeedsReauth"
      :isMain="false"
      :highlightMain="true"
      :loginParams="loginParams"
      :access="accessFull"
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
      characterBasic: characterBasic(),
      characterOpsecAlt: characterOpsec(),
      characterNeedsReauth: characterNeedsReauth(),
      characterEmptyQueue: characterBasic(emptySkillQueue()),
      characterPausedQueue: characterBasic(pausedSkillQueue()),
      characterUnfresQueue: characterBasic(unfreshSkillQueue()),

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

function characterBasic(skillQueue) {
  return {
    id: 95773199,
    name: 'Brienne Lesqagar',
    needsReauth: false,
    opsec: false,
    corpStatus: 'primary',
    skillQueue: skillQueue || sampleSkillQueue(),
  };
}

function characterOpsec() {
  let character = characterBasic();
  character.opsec = true;
  character.corpStatus = 'external';
  return character;
}

function characterNeedsReauth(skillQueue) {
  let character = characterBasic(skillQueue);
  character.needsReauth = true;
  return character;
}

function sampleSkillQueue() {
  return {
    dataStatus: 'fresh',
    queueStatus: 'active',
    skillInTraining: {
      name: 'Repair Systems V',
      progress: 0.3886220453208478,
      timeRemaining: '2d 1h'
    },
    queue: {
      count: 4,
      timeRemaining: '25d 14h'
    }
  };
}

function emptySkillQueue() {
  return {
    dataStatus: 'fresh',
    queueStatus: 'empty',
    skillInTraining: null,
    queue: {
      count: 0,
      timeRemaining: null,
    },
  };
}

function pausedSkillQueue() {
  return {
    dataStatus: 'fresh',
    queueStatus: 'paused',
    skillInTraining: {
      name: 'Gallente Frigate V',
      progress: 0.17560084462264822,
      timeRemaining: null,
    },
    queue: {
      count: 6,
      timeRemaining: null,
    }
  };
}

function unfreshSkillQueue() {
  let queue = sampleSkillQueue();
  queue.dataStatus = 'bad_credentials';
  return queue;
}

</script>

<style scoped>
.entry-title {
  margin: 20px 0 10px 0;
}

.section {
  font-size: 20px;
  color: #a7a29c;
  margin: 50px 0 5px 0;
  font-weight: 300;
}
</style>
