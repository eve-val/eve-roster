<!--

A component that displays the "ring-like" presentation of a fitting as seen
in-game, but optimized for displaying killmails.

-->

<template>
  <div class="_killmail-fitting">
    <eve-image
      :id="fitting.ship"
      type="render"
      :size="1024"
      class="hero-image"
      :style="{
        width: `${imageRadius * 2}%`,
        height: `${imageRadius * 2}%`,
        left: `${50 - imageRadius}%`,
        top: `${50 - imageRadius}%`,
      }"
    />
    <img src="./fitting_ring.svg" class="ring-image" />
    <div
      v-for="(slot, i) in slots"
      :key="i"
      class="slot"
      :style="{
        left: `${slot.x}%`,
        top: `${slot.y}%`,
        width: `${slotSize}%`,
        height: `${slotSize}%`,
      }"
    >
      <img
        src="./slot_background.svg"
        class="slot-bg"
        :style="{
          transform: `rotate(${slot.rotation}rad)`,
        }"
      />
      <!--
        For a less visually messy ring, swap this with slot-bg above and set
        moduleSize to 6
       -->
      <!-- <img
        src="./octo_slot.svg"
        class="slot-bg"
      /> -->
      <eve-image
        v-if="slot.typeId"
        :id="slot.typeId"
        type="type"
        :size="40"
        :title="name(slot.typeId)"
        class="module-icon"
        :style="{
          left: `${((1 - moduleSize / slotSize) / 2) * 100}%`,
          top: `${((1 - moduleSize / slotSize) / 2) * 100}%`,
          width: `${(moduleSize / slotSize) * 100}%`,
          height: `${(moduleSize / slotSize) * 100}%`,
        }"
      />
    </div>
  </div>
</template>

<script lang="ts">
import { PropType, defineComponent } from "vue";
import EveImage from "../shared/EveImage.vue";
import { NameCacheMixin } from "../shared/nameCache";
import {
  KmFitting,
  KmSlotSection,
} from "../../shared/types/killmail/KmFitting";
import { arrayToMap } from "../../shared/util/collections";

export default defineComponent({
  components: {
    EveImage,
  },

  mixins: [NameCacheMixin],

  props: {
    fitting: { type: Object as PropType<KmFitting>, required: true },
  },

  data() {
    // Unless stated otherwise, all units are percentage of total size of this
    // element
    return {
      // The radius of the ring around which them modules will be aligned
      moduleRadius: 45,
      // The radius of the hero image
      imageRadius: 42,
      // The size of the slot graphics
      slotSize: 8,
      // The size of the module graphics
      moduleSize: 7,
      // The angle (in degrees) between slots
      slotAngle: 10,
    };
  },

  computed: {
    slots() {
      const sections = arrayToMap(this.fitting.sections, "name");

      const highSlots = sections.get("high") as KmSlotSection | undefined;
      const midSlots = sections.get("mid") as KmSlotSection | undefined;
      const lowSlots = sections.get("low") as KmSlotSection | undefined;
      const rigSlots = sections.get("rig") as KmSlotSection | undefined;
      const subsystemSlots = sections.get("subsystem") as
        | KmSlotSection
        | undefined;

      const renderSlots: Slot[] = [];

      this.processSection(deg2rad(-35), highSlots, "cw", renderSlots);
      this.processSection(deg2rad(55), midSlots, "cw", renderSlots);
      this.processSection(deg2rad(145), lowSlots, "cw", renderSlots);
      this.processSection(deg2rad(-55), rigSlots, "ccw", renderSlots);
      this.processSection(deg2rad(235), subsystemSlots, "cw", renderSlots);

      return renderSlots;
    },
  },

  methods: {
    processSection(
      startingAngle: number,
      section: KmSlotSection | undefined,
      direction: "cw" | "ccw",
      out: Slot[],
    ) {
      if (section == null) {
        return;
      }

      let currentAngle = startingAngle;

      const stepAngle = deg2rad(this.slotAngle);

      for (const kmSlot of section.slots) {
        out.push({
          ...this.getPercentageOffsets(currentAngle),
          rotation: currentAngle,
          typeId: kmSlot?.module?.typeId ?? null,
        });
        if (direction == "cw") {
          currentAngle += stepAngle;
        } else {
          currentAngle -= stepAngle;
        }
      }
    },

    getPercentageOffsets(radians: number) {
      const centerX = Math.sin(radians) * this.moduleRadius;
      const centerY = -Math.cos(radians) * this.moduleRadius;

      return {
        x: 50 + centerX - this.slotSize / 2,
        y: 50 + centerY - this.slotSize / 2,
      };
    },
  },
});

function deg2rad(degress: number) {
  return (degress / 180) * Math.PI;
}

interface Slot {
  x: number;
  y: number;
  rotation: number;
  typeId: number | null;
}
</script>

<style scoped>
._killmail-fitting {
  position: relative;
  aspect-ratio: 1 / 1;
}

.hero-image {
  mask-image: url("./circle_mask.svg");
  mask-size: cover;
  mask-repeat: no-repeat;
  position: absolute;
}

.ring-image {
  width: 100%;
  height: 100%;
  position: absolute;
  left: 0;
  top: 0;
  opacity: 1;
}

.slot {
  position: absolute;
}

.slot-bg {
  width: 100%;
  height: 100%;
}

.slot:hover > .slot-bg {
  filter: brightness(1.5);
}

.module-icon {
  position: absolute;
  top: 0;
  left: 0;
}
</style>
