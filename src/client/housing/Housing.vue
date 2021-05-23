<template>
  <div
    class="root-container"
    @mousemove.prevent="onMouseMove"
    @mouseup="onMouseUp"
  >
    <app-header :identity="identity" />
    <div class="split-container">
      <div class="housing-container">
        <h1>Housing</h1>
        <div class="housing-flex-container">
          <citadel-row
            v-for="citadel in citadels"
            :key="citadel.name"
            :row="citadel"
            @chipDrag="chipDrag"
            @hover="hover"
            @unhover="unhover"
          />
        </div>
      </div>
      <div class="unassigned-container">
        <h3>Unassigned</h3>
        <citadel-row
          :row="unassignedPilots2"
          @chipDrag="chipDrag"
          @hover="hover"
          @unhover="unhover"
        />
      </div>
    </div>
    <member-chip
      v-if="draggedCharacter != null"
      ref="dragChip"
      :character="draggedCharacter"
      class="dragged-chip"
      style="transform: translate3d(0, 0, 0)"
      @chipDrag="chipDrag"
    />
  </div>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";
import AppHeader from "../shared/AppHeader.vue";

import CitadelRow from "./CitadelRow.vue";
import MemberChip from "./MemberChip.vue";

const UNASSIGNED_KEY = "__unassigned__";

import { Identity } from "../home";
import { AxiosResponse } from "axios";
import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AppHeader,
    CitadelRow,
    MemberChip,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      pilots: [],
      draggedName: null,
    };
  },

  computed: {
    draggedCharacter: () => {
      console.log("draggedCharacter()!");
      if (this.draggedName == null) {
        return null;
      } else {
        return this.findCharacter(this.draggedName);
      }
    },

    pilotsByHouse: () => {
      // TODO: Initialize this with the list of all known citadels
      let houseMap = {
        [UNASSIGNED_KEY]: { name: UNASSIGNED_KEY, occupants: [] },
      };
      for (let i = 0; i < this.pilots.length; i++) {
        var pilot = this.pilots[i];
        let citadel = pilot.homeCitadel || UNASSIGNED_KEY;
        var house = houseMap[citadel];
        if (!house) {
          house = {
            name: citadel,
            occupants: [pilot],
          };
          houseMap[citadel] = house;
        } else {
          house.occupants.push(pilot);
        }
      }

      return houseMap;
    },

    citadels: () => {
      let houseList = [];
      for (let v in this.pilotsByHouse) {
        let house = this.pilotsByHouse[v];
        if (house.name != UNASSIGNED_KEY) {
          houseList.push(house);
        }
      }

      // TODO sort houses on something

      return houseList;
    },

    unassignedPilots: () => {
      return this.pilotsByHouse[UNASSIGNED_KEY].occupants;
    },

    unassignedPilots2: () => {
      return this.pilotsByHouse[UNASSIGNED_KEY];
    },
  },

  created: function () {
    ajaxer
      .fetchRoster()
      .then((response: AxiosResponse) => {
        this.pilots = this.transformPilots(response.data);
      })
      .catch(function (err) {
        console.log("DATA FETCH ERROR:", err);
      });
  },

  methods: {
    transformPilots: (pilots) => {
      for (let i = 0; i < pilots.length; i++) {
        let pilot = pilots[i];
        pilot.transactionInProgress = false;
      }
      return pilots;
    },

    onMouseMove: (ev: Event) => {
      if (this.draggedCharacter != null) {
        ev.preventDefault();

        this.dragChipX += ev.screenX - this.prevDragMouseX;
        this.dragChipY += ev.screenY - this.prevDragMouseY;

        this.prevDragMouseX = ev.screenX;
        this.prevDragMouseY = ev.screenY;

        this.positionDragChip(this.dragChipX, this.dragChipY);
      }
    },

    onMouseUp: (_ev: Event) => {
      if (this.draggedCharacter != null) {
        if (this.hoverTarget != null) {
          let character = this.draggedCharacter;
          let sourceCitadel = character.homeCitadel;
          let targetCitadel = this.hoverTarget.row.name;

          console.log(
            "Moving %s from %s to %s",
            this.draggedCharacter.name,
            sourceCitadel,
            targetCitadel
          );

          character.homeCitadel = targetCitadel;
          character.transactionInProgress = true;
          this.hoverTarget = null;

          ajaxer
            .updatePilot({ homeCitadel: targetCitadel })
            .then(() => {
              character.transactionInProgress = false;
            })
            .catch((_err) => {
              // TODO handle this
              console.log("ERROR UPDATING PILOT");
              character.transactionInProgress = false;
            });
        }

        this.sourceChip.visible = true;
        this.sourceChip = null;

        this.draggedName = null;
      }
    },

    positionDragChip: (x, y) => {
      this.$refs.dragChip.$el.style.left = x + "px";
      this.$refs.dragChip.$el.style.top = y + "px";
    },

    findCharacter: (name) => {
      for (let i = 0; i < this.pilots.length; i++) {
        if (this.pilots[i].name == name) {
          return this.pilots[i];
        }
      }
      return null;
    },

    chipDrag: (chip, name, citadel, bounds, mouseX, mouseY) => {
      this.sourceChip = chip;
      this.draggedName = name;

      this.dragChipX = bounds.left;
      this.dragChipY = bounds.top;
      this.prevDragMouseX = mouseX;
      this.prevDragMouseY = mouseY;

      this.sourceChip.visible = false;

      this.$nextTick(function () {
        this.positionDragChip(this.dragChipX, this.dragChipY);
      });
    },

    hover: (target: Event) => {
      this.hoverTarget = target;
    },

    unhover: (target: Event) => {
      if (target == this.hoverTarget) {
        this.hoverTarget = null;
      }
    },
  },
});
</script>

<style scoped>
.root-container {
  height: 100vh;
  display: flex;
  flex-direction: column;
}

.split-container {
  flex-grow: 1;
  display: flex;
  flex-direction: row;
  align-items: stretch;
}

.housing-container {
  flex-grow: 1;
  overflow-y: scroll;
}

.housing-flex-container {
  display: flex;
  flex-wrap: wrap;
}

.unassigned-container {
  flex: 0 0 200px;
  overflow-y: scroll;
}

.dragged-chip {
  position: absolute;
  left: 50px;
  top: 50px;
  pointer-events: none;
}
</style>
