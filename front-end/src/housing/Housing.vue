<template>
<div
    class="root-container"
    @mousemove.prevent="onMouseMove"
    @mouseup="onMouseUp">
  <app-header :identity="identity" />
  <div class="split-container">
    <div class="housing-container">
      <h1>Housing</h1>
      <citadel-row v-for="citadel in citadels"
          :row="citadel"
          :bus="bus"
          />
    </div>
    <div class="unassigned-container">
      <h3>Unassigned</h3>
      <member-chip v-for="pilot in unassignedPilots"
          :character="pilot"
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

<script>
let axios = require('axios');
import Vue from 'vue';

import AppHeader from '../shared/AppHeader.vue';

import CitadelRow from './CitadelRow.vue';
import MemberChip from './MemberChip.vue';

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
      self.draggedChip = chip;
      // Make a copy here, otherwise...bad things.
      self.draggedCharacter = Object.assign({}, self.findCharacter(name));
      self.dragSourceCitadel = self.draggedCharacter.homeCitadel;

      self.dragChipX = bounds.left;
      self.dragChipY = bounds.top;
      self.prevDragMouseX = mouseX;
      self.prevDragMouseY = mouseY;

      chip.visible = false;

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
      draggedCharacter: null,
      bus: bus,
    };
  },

  computed: {
    pilotsByHouse: function() {
      // TODO: Initialize this with the list of all known citadels
      let houseMap = {
        '': { name: '', occupants: [] }
      };
      for (let i = 0; i < this.pilots.length; i++) {
        var pilot = this.pilots[i];
        var house = houseMap[pilot.homeCitadel];
        if (!house) {
          house = {
            name: pilot.homeCitadel,
            occupants: [pilot]
          };
          houseMap[pilot.homeCitadel] = house;
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
        if (house.name != '') {
          houseList.push(house);
        }
      }

      // TODO sort houses on something

      return houseList;
    },

    unassignedPilots: function() {
      return this.pilotsByHouse[''].occupants;
    },
  },

  created: function() {
    let self = this;
    axios.get('/fake-data/member_tracking_example.json')
      .then(function (response) {
        console.log('Loaded!');
        self.pilots = response.data;
      })
      .catch(function (err) {
        console.log('DATA FETCH ERROR:', err);
      });
  },

  methods: {
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
          let targetCitadel = this.hoverTarget.row.name;

          console.log('Moving %s from %s to %s',
              this.draggedCharacter.name,
              this.dragSourceCitadel,
              targetCitadel);

          this.findCharacter(this.draggedCharacter.name).homeCitadel =
              targetCitadel;

          this.hoverTarget = null;
        }

        this.draggedChip.visible = true;

        this.draggedChip = null;
        this.draggedCharacter = null;
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

.unassigned-container {
  flex: 0 0 300px;
  overflow-y: scroll;
}

.dragged-chip {
  position: absolute;
  left: 50px;
  top: 50px;
  pointer-events: none;
}
</style>