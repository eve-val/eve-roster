<!--

Represents a row in a table of SRP-able losses. Displays information about
the loss (ship, victim, attacker) as well as the loss's SRP status (SRP verdict,
awarded payout).

This component has an 'edit mode' that allows the user to set the SRP status
and payout. It can start in edit mode (used during the SRP approval flow) or
the user can manually enter edit mode if they have sufficient privileges (used
in most other places).

-->

<template>
  <div
    class="_loss-row"
    :style="{ backgroundColor: highlightAsRelated ? '#171717' : undefined }"
  >
    <srp-triplet
      class="shiplet"
      :icon-id="srp.shipType"
      :icon-type="'Type'"
      :top-line="name(srp.shipType)"
      :bottom-line="srp.timestamp"
      :default-href="zkillHref(srp.killmail, 'kill')"
    >
      <template #top-line-extra>
        <a
          v-if="srp.relatedKillmail != null"
          class="related-link"
          :href="zkillHref(srp.relatedKillmail.id, 'kill')"
        >
          <eve-image
            :id="srp.relatedKillmail.shipId"
            type="Type"
            :size="13"
            @mouseenter="onRelatedHover"
            @mouseleave="onRelatedUnhover"
          />
        </a>
      </template>
    </srp-triplet>

    <srp-triplet
      class="victimlet"
      :icon-id="srp.victim || srp.victimCorp"
      :icon-type="victimIconType"
      :top-line="name(srp.victim || srp.victimCorp)"
      :bottom-line="name(srp.victimCorp)"
      :default-href="victimHref"
      :bot-href="zkillHref(srp.victimCorp, 'corporation')"
    />

    <srp-triplet
      class="executionerlet"
      :icon-id="executionerAffiliation"
      :icon-type="executionerIconType"
      :top-line="name(srp.executioner.character || srp.executioner.ship)"
      :bottom-line="name(executionerAffiliation)"
      :default-href="
        zkillHref(executionerAffiliation, executionerAffiliationType)
      "
      :top-href="zkillHref(srp.executioner.character, 'character')"
    />

    <srp-status
      class="srp-status"
      :initial-srp="srp"
      :has-edit-priv="hasEditPriv"
      :start-in-edit-mode="startInEditMode"
    />
  </div>
</template>

<script lang="ts">
import EveImage from "../shared/EveImage.vue";
import SrpStatus from "./SrpStatus.vue";
import SrpTriplet from "./SrpTriplet.vue";

import { Srp } from "./types";
import { AssetType } from "../shared/types";
import { NameCacheMixin } from "../shared/nameCache";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    EveImage,
    SrpStatus,
    SrpTriplet,
  },

  mixins: [NameCacheMixin],

  props: {
    srp: { type: Object as PropType<Srp>, required: true },
    hasEditPriv: { type: Boolean as PropType<boolean>, required: true },
    startInEditMode: { type: Boolean as PropType<boolean>, required: true },
    highlightAsRelated: {
      type: Boolean as PropType<boolean>,
      required: false,
      default: false,
    },
  },

  emits: ["related-hover", "related-unhover"],

  computed: {
    victimIconType(): AssetType {
      if (this.srp.victim != undefined) {
        return "Character";
      } else {
        return "Corporation";
      }
    },

    victimHref(): string | null {
      if (this.srp.victim != undefined) {
        return `/character/${this.srp.victim}`;
      } else {
        return null;
      }
    },

    executionerIconType(): AssetType {
      if (this.srp.executioner.alliance) {
        return "Alliance";
      } else if (this.srp.executioner.corporation) {
        return "Corporation";
      } else {
        return "Type";
      }
    },

    executionerAffiliation(): number {
      return (
        this.srp.executioner.alliance ||
        this.srp.executioner.corporation ||
        this.srp.executioner.ship
      );
    },

    executionerAffiliationType(): string {
      if (this.srp.executioner.alliance) {
        return "alliance";
      } else if (this.srp.executioner.corporation) {
        return "corporation";
      } else {
        return "ship";
      }
    },
  },

  methods: {
    onRelatedHover() {
      this.$emit("related-hover", this.srp.relatedKillmail.id);
    },

    onRelatedUnhover() {
      this.$emit("related-unhover", this.srp.relatedKillmail.id);
    },

    zkillHref(id: number, type: string): string | undefined {
      if (id == undefined) {
        return undefined;
      } else {
        return `https://zkillboard.com/${type}/${id}/`;
      }
    },
  },
});
</script>

<style scoped>
._loss-row {
  display: flex;
  height: 77px;
  align-items: center;
  border-bottom: 1px solid #2c2c2c;
}

.shiplet,
.victimlet,
.executionerlet {
  width: 220px;
  margin-right: 8px;
}

.shiplet {
  margin-left: 10px;
}

.related-link {
  margin-left: 4px;
}
</style>
