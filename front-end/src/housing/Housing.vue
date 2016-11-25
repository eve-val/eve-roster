<template>
<div
    class="root-container"
    @mousemove.prevent="onMouseMove"
    @mouseup="onMouseUp">
  <app-header :identity="identity" />
  <div class="split-container">
    <div class="housing-container">
      <h1>Housing</h1>
      <div class="housing-flex-container">
        <citadel-row v-for="citadel in citadels"
            :row="citadel"
            :bus="bus"
            :key="citadel.name"
            />
      </div>
    </div>
    <div class="unassigned-container">
      <h3>Unassigned</h3>
      <citadel-row
            :row="unassignedPilots2"
            :bus="bus"
            />        
    </div>
  </div>
  <member-chip v-if="draggedCharacter != null"
      ref="dragChip"
      :character="draggedCharacter"
      class="dragged-chip"
      style="transform: translate3d(0,0,0)"
      />
</div>
</template>

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

<script>
import Vue from 'vue';

import ajaxer from '../shared/ajaxer'
import AppHeader from '../shared/AppHeader.vue';

import CitadelRow from './CitadelRow.vue';
import MemberChip from './MemberChip.vue';

const UNASSIGNED_KEY = '__unassigned__';

export default {
  components: {
    AppHeader,
    CitadelRow,
    MemberChip,
  },

  props: {
    identity: { type: Object, required: true }
  },

  data () {
    var bus = new Vue();
    var self = this;

    bus.$on('chipDrag', function(chip, name, citadel, bounds, mouseX, mouseY) {
      self.sourceChip = chip;
      self.draggedName = name;

      self.dragChipX = bounds.left;
      self.dragChipY = bounds.top;
      self.prevDragMouseX = mouseX;
      self.prevDragMouseY = mouseY;

      self.sourceChip.visible = false;

      self.$nextTick(function() {
        this.positionDragChip(this.dragChipX, this.dragChipY);
      });
    });

    bus.$on('hover', function(target) {
      self.hoverTarget = target;
    });

    bus.$on('unhover', function(target) {
      if (target == self.hoverTarget) {
        self.hoverTarget = null;
      }
    });

    return {
      pilots: [],
      draggedName: null,
      bus: bus,
    };
  },

  computed: {
    draggedCharacter: function() {
      console.log('draggedCharacter()!');
      if (this.draggedName == null) {
        return null;
      } else {
        return this.findCharacter(this.draggedName);
      }
    },

    pilotsByHouse: function() {
      // TODO: Initialize this with the list of all known citadels
      let houseMap = {
        [UNASSIGNED_KEY]: { name: UNASSIGNED_KEY, occupants: [] }
      };
      for (let i = 0; i < this.pilots.length; i++) {
        var pilot = this.pilots[i];
        let citadel = pilot.homeCitadel || UNASSIGNED_KEY;
        var house = houseMap[citadel];
        if (!house) {
          house = {
            name: citadel,
            occupants: [pilot]
          };
          houseMap[citadel] = house;
        } else {
          house.occupants.push(pilot);
        }
      }

      return houseMap;
    },

    citadels: function() {
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

    unassignedPilots: function() {
      return this.pilotsByHouse[UNASSIGNED_KEY].occupants;
    },

    unassignedPilots2: function() {
      return this.pilotsByHouse[UNASSIGNED_KEY];
    },
  },

  created: function() {
    let self = this;
    ajaxer.fetchRoster()
      .then(function (response) {
        self.pilots = self.transformPilots(response.data);
      })
      .catch(function (err) {
        console.log('DATA FETCH ERROR:', err);
      });
  },

  methods: {
    transformPilots: function(pilots) {
      for (let i = 0; i < pilots.length; i++) {
        let pilot = pilots[i];
        pilot.transactionInProgress = false;
      }
      return pilots;
    },

    onMouseMove: function(ev) {
      if (this.draggedCharacter != null) {
        ev.preventDefault();

        this.dragChipX += ev.screenX - this.prevDragMouseX;
        this.dragChipY += ev.screenY - this.prevDragMouseY;

        this.prevDragMouseX = ev.screenX;
        this.prevDragMouseY = ev.screenY;

        this.positionDragChip(this.dragChipX, this.dragChipY);
      }
    },

    onMouseUp: function(ev) {
      if (this.draggedCharacter != null) {
        if (this.hoverTarget != null) {
          let character = this.draggedCharacter;
          let sourceCitadel = character.homeCitadel;
          let targetCitadel = this.hoverTarget.row.name;

          console.log('Moving %s from %s to %s',
              this.draggedCharacter.name,
              sourceCitadel,
              targetCitadel);

          character.homeCitadel = targetCitadel;
          character.transactionInProgress = true;
          this.hoverTarget = null;

          ajaxer.updatePilot({ homeCitadel: targetCitadel })
              .then(() => {
                character.transactionInProgress = false;
              })
              .catch(err => {
                // TODO handle this
                console.log('ERROR UPDATING PILOT');
                character.transactionInProgress = false;
              });
        }

        this.sourceChip.visible = true;
        this.sourceChip = null;

        this.draggedName = null;
      }
    },

    positionDragChip: function(x, y) {
      this.$refs.dragChip.$el.style.left = x + 'px';
      this.$refs.dragChip.$el.style.top = y + 'px';
    },

    findCharacter: function(name) {
      for (let i = 0; i < this.pilots.length; i++) {
        if (this.pilots[i].name == name) {
          return this.pilots[i];
        }
      }
      return null;
    },
  }
}
</script>