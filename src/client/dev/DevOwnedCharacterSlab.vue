<template>
  <div class="_dev-owned-character-slap">
    <div class="entry-title">Main</div>
    <owned-character-slab
      :account-id="0"
      :character="characterBasic"
      :is-main="true"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">Alt</div>
    <owned-character-slab
      :account-id="0"
      :character="characterBasic"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">Opsec alt</div>
    <owned-character-slab
      :account-id="0"
      :character="characterOpsecAlt"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">ESI failure</div>
    <owned-character-slab
      :account-id="0"
      :character="characterEsiFailure"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">Biomassed character</div>
    <owned-character-slab
      :account-id="0"
      :character="characterBiomassed"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <!-- Skill queue variations -->
    <div class="section">Skill queue variations</div>

    <div class="entry-title">Empty queue</div>
    <owned-character-slab
      :account-id="0"
      :character="characterEmptyQueue"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">Paused queue</div>
    <owned-character-slab
      :account-id="0"
      :character="characterPausedQueue"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <!-- Action handling -->
    <div class="section">Action handling</div>

    <div class="entry-title">Action pending</div>
    <owned-character-slab
      :promise="actionPendingSlab"
      :account-id="0"
      :character="characterBasic"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">Action failed</div>
    <owned-character-slab
      :promise="actionFailedSlab"
      :account-id="0"
      :character="characterBasic"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <div class="entry-title">ESI error</div>
    <owned-character-slab
      :account-id="0"
      :character="characterUnfresQueue"
      :is-main="true"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />

    <!-- Misc -->
    <div class="section">Misc</div>

    <div class="entry-title">Needs reauth</div>
    <owned-character-slab
      :account-id="0"
      :character="characterNeedsReauth"
      :is-main="false"
      :highlight-main="true"
      :login-params="loginParams"
      :access="accessFull"
    />
  </div>
</template>

<script lang="ts">
import OwnedCharacterSlab from "../dashboard/OwnedCharacterSlab.vue";
import { CORP_DOOMHEIM } from "../../shared/eveConstants";
import { CharacterJson } from "../../route/api/dashboard";
import { SkillQueueSummary } from "../../domain/skills/skillQueueSummary";
import { defineComponent } from "vue";
export default defineComponent({
  components: {
    OwnedCharacterSlab,
  },

  data() {
    return {
      actionPendingSlab: pendingPromise(),
      actionFailedSlab: errorPromise(),

      characterBasic: characterBasic(sampleSkillQueue()),
      characterOpsecAlt: characterOpsec(sampleSkillQueue()),
      characterEsiFailure: characterBasic(warningSkillQueue()),
      characterBiomassed: characterBiomassed(),
      characterNeedsReauth: characterNeedsReauth(warningSkillQueue()),
      characterEmptyQueue: characterBasic(emptySkillQueue()),
      characterPausedQueue: characterBasic(pausedSkillQueue()),
      characterUnfresQueue: characterBasic(unfreshSkillQueue()),

      accessFull: {
        isMember: true,
        designateMain: 2,
      },

      loginParams: "foo=bar&baz=pizza",
    };
  },
});

function pendingPromise() {
  return new Promise(() => {});
}

function errorPromise() {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      reject("A terrible error has occurred.");
    }, 1000);
  });
}

function characterBasic(skillQueue: SkillQueueSummary): CharacterJson {
  return {
    id: 95773199,
    name: "Brienne Lesqagar",
    needsReauth: false,
    opsec: false,
    corpStatus: "primary",
    skillQueue: skillQueue || sampleSkillQueue(),
    corpId: 123456,
  };
}

function characterOpsec(skillQueue: SkillQueueSummary): CharacterJson {
  let character = characterBasic(skillQueue);
  character.opsec = true;
  character.corpStatus = "external";
  return character;
}

function characterBiomassed(): CharacterJson {
  let character = characterBasic(emptySkillQueue());
  character.corpId = CORP_DOOMHEIM;
  return character;
}

function characterNeedsReauth(skillQueue: SkillQueueSummary): CharacterJson {
  let character = characterBasic(skillQueue);
  character.needsReauth = true;
  return character;
}

function sampleSkillQueue(): SkillQueueSummary {
  return {
    dataFreshness: "fresh",
    queueStatus: "active",
    skillInTraining: {
      name: "Repair Systems V",
      progress: 0.3886220453208478,
      timeRemaining: "2d 1h",
    },
    queue: {
      count: 4,
      timeRemaining: "25d 14h",
    },
  };
}

function emptySkillQueue(): SkillQueueSummary {
  return {
    dataFreshness: "fresh",
    queueStatus: "empty",
    skillInTraining: null,
    queue: {
      count: 0,
      timeRemaining: null,
    },
  };
}

function pausedSkillQueue(): SkillQueueSummary {
  return {
    dataFreshness: "fresh",
    queueStatus: "paused",
    skillInTraining: {
      name: "Gallente Frigate V",
      progress: 0.17560084462264822,
      timeRemaining: null,
    },
    queue: {
      count: 6,
      timeRemaining: null,
    },
  };
}

function unfreshSkillQueue(): SkillQueueSummary {
  let queue = sampleSkillQueue();
  queue.warning = "bad_credentials";
  return queue;
}

function warningSkillQueue(): SkillQueueSummary {
  let queue = sampleSkillQueue();
  queue.dataFreshness = "cached";
  queue.warning = "bad_credentials";

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
