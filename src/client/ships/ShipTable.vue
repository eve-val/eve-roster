<template>
  <table class="table" v-if="ships.length">
    <thead>
      <tr>
        <th class="char-name" v-if="showMainCharacter">Main</th>
        <th class="char-name">Character</th>
        <th class="ship-type">Type</th>
        <th class="ship-name">Name</th>
        <th class="ship-loc">Location</th>
      </tr>
    </thead>
    <tbody>
      <tr class="ship-row" v-for="ship in sorted(ships)" :key="ship.id">
        <td v-if="showMainCharacter">{{ ship.mainCharacterName }}</td>
        <td>{{ ship.characterName }}</td>
        <td>{{ ship.type }}</td>
        <td>{{ ship.name }}</td>
        <td>{{ ship.locationDescription }}</td>
      </tr>
    </tbody>
  </table>
  <div class="empty-list" v-else>
    No borrowed corp ships found. Neat!
  </div>
</template>

<script>
export default {
  props: {
    showMainCharacter: { type: Boolean, required: false, default: false },
    ships: { type: Array, required: true },
  },

  methods: {
    sorted: function(inp) {
      let ships = inp.slice();
      ships.sort((a, b) => {
        if (a.mainCharacterName !== b.mainCharacterName) {
          return a.mainCharacterName.localeCompare(b.mainCharacterName);
        }
        if (a.characterName !== b.characterName) {
          return a.characterName.localeCompare(b.characterName);
        }
        if (a.locationDescription !== b.locationDescription) {
          return a.locationDescription.localeCompare(b.locationDescription);
        }
        return a.type.localeCompare(b.type);
      });
      return ships;
    },
  },
};
</script>

<style scoped>
table {
  table-layout: fixed;
  text-align: left;
  font-size: 14px;
  width: 95%;
  border-collapse: collapse;
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
