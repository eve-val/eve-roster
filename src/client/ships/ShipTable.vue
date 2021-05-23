<template>
  <table v-if="ships.length" class="table">
    <thead>
      <tr>
        <th
          v-if="showMainCharacter"
          class="char-name"
          @click="setSort('mainCharacterName')"
        >
          Main
        </th>
        <th class="char-name" @click="setSort('characterName')">Character</th>
        <th class="ship-type" @click="setSort('type')">Type</th>
        <th class="ship-name" @click="setSort('name')">Name</th>
        <th class="ship-loc" @click="setSort('locationDescription')">
          Location
        </th>
      </tr>
    </thead>
    <tbody>
      <tr v-for="ship in sorted" :key="ship.id">
        <td v-if="showMainCharacter">
          {{ ship.mainCharacterName }}
        </td>
        <td>{{ ship.characterName }}</td>
        <td>{{ ship.type }}</td>
        <td>{{ ship.name }}</td>
        <td>{{ ship.locationDescription }}</td>
      </tr>
    </tbody>
  </table>
  <div v-else class="empty-list">No borrowed corp ships found. Neat!</div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
export default defineComponent({
  props: {
    showMainCharacter: { type: Boolean, required: false, default: false },
    ships: { type: Array, required: true },
  },

  data: function () {
    return {
      sortOrder: [
        "mainCharacterName",
        "characterName",
        "locationDescription",
        "type",
        "name",
      ],
    };
  },

  computed: {
    sorted: function () {
      const copy = [...this.ships];
      copy.sort((a, b) => {
        for (let prop of this.sortOrder) {
          let ap = a[prop];
          let bp = b[prop];
          if (ap != bp) {
            return ap.localeCompare(bp);
          }
        }
        return 0;
      });
      return copy;
    },
  },

  methods: {
    setSort: function (column) {
      const idx = this.sortOrder.indexOf(column);
      if (idx < 0) return;
      this.sortOrder.splice(idx, 1);
      this.sortOrder.unshift(column);
    },
  },
});
</script>

<style scoped>
table {
  table-layout: fixed;
  text-align: left;
  font-size: 14px;
  width: 95%;
  border-collapse: collapse;
}

th {
  cursor: pointer;
}

thead th.char-name {
  width: 12%;
}

thead th.ship-type {
  width: 8%;
}

thead th.ship-name {
  width: 16%;
}

thead th.ship-loc {
  width: 40%;
}

th,
td {
  padding: 10px 8px;
}

th {
  font-weight: normal;
  color: #a7a29c;
  padding-bottom: 5px;
}

tbody tr:nth-child(even) {
  background-color: #181818;
}

tbody tr:nth-child(odd) {
  background-color: #131313;
}

div.empty-list {
  font-size: 14px;
  width: 95%;
  padding: 10px 8px;
  background-color: #181818;
}
</style>
