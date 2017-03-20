<template>
<admin-wrapper title="Citadel management" :identity="identity">
<div class="add-citadel">
  <input class="citadel-name" v-model="newCitadel.name"
    @keydown="addLogic"
    placeholder="Type a new citadel name, then press enter to add...">
  <label>Type:
    <select class="citadel-type" v-model="newCitadel.type">
      <option value="Astrahus">Astrahus</option>
      <option value="Fortizar">Fortizar</option>
      <option value="Keepstar">Keepstar</option>
      <option value="Raitaru">Raitaru</option>
      <option value="Azbel">Azbel</option>
    </select>
  </label>
  <label>Alliance Access:
    <select class="alliance-access" v-model="newCitadel.allianceAccess">
      <option value="1">YES</option>
      <option value="0">NO</option>
    </select>
  </label>
  <label>Alliance Owned:
    <select class="alliance-owned" v-model="newCitadel.allianceOwned">
      <option value="1">YES</option>
      <option value="0">NO</option>
    </select>
  </label>
</div>
<div v-for="citadel in sortedCitadels" class="citadel">
  <input class="name" :value="citadel.name"
    @blur="validate(citadel.id, citadel.name, $event)"
    @keydown="editLogic(citadel.name, $event)">
  <button class="remove" @click="removeCitadel(citadel.id)">Remove</button>
</div>
</admin-wrapper>
</template>

<script>
import ajaxer from '../shared/ajaxer';
import AdminWrapper from './AdminWrapper.vue';

export default {
  components: {
    AdminWrapper,
  },

  props: {
    identity: { type: Object, required: true, },
  },

  data: function() {
    return {
      citadels: [],
      newCitadel: {
        name: '',
        type: 'Astrahus',
        allianceAccess: 1,
        allianceOwned: 1,
      },
    };
  },

  computed: {
    sortedCitadels: function() {
      let sortedCitadels = this.citadels.slice();
      sortedCitadels.sort((a,b) => {
        return a.name.localeCompare(b.name);
      });
      return sortedCitadels;
    },
  },

  created: function() {
    this.fetchData();
  },

  methods: {
    fetchData() {
      this.citadelsPromise = ajaxer.getCitadels()
          .then(response => {
            this.citadels = response.data.citadels;
          });
    },

    addCitadel() {
      let c = this.newCitadel;
      this.addPromise = ajaxer.postCitadel(c.name, c.type, c.allianceAccess, c.allianceOwned)
          .then(response => {
            this.citadels.push(response.data)
            this.newCitadel.name = '';
          });
    },

    removeCitadel(id) {
      this.deletePromise = ajaxer.deleteCitadel(id)
          .then(response => {
            for(let i=0; i < this.citadels.length; i++) {
              if(this.citadels[i].id === id) {
                this.citadels.splice(i, 1);
                break;
              }
            }
          });
    },

    renameCitadel(id, name) {
      this.renamePromise = ajaxer.putCitadelName(id, name)
          .then(response => {
            this.citadels.map(citadel => {
              if(citadel.id === id) {
                citadel.name = name;
              }
            });
          });
    },

    addLogic(event) {
      // Check for editing finish
      if(event.which === /* Enter */ 13) {
        event.preventDefault();
        event.target.blur();
        if(event.target.value) {
          this.addCitadel();
        }
      } else if(event.which === /* Esc */ 27) {
        event.preventDefault();
        event.target.value = '';
        event.target.blur();
      }
    },

    editLogic(oldName, event) {
      let text = event.target.value;

      // Check for editing finish
      if(event.which === /* Enter */ 13) {
        event.preventDefault();
        event.target.blur();
      } else if(event.which === /* Esc */ 27) {
        event.preventDefault();
        event.target.value = oldName;
        event.target.blur();
      }
    },

    validate(id, name, event) {
      this.editLogic(name, event);
      let newName = event.target.value;
      if(newName !== name) {
        this.renameCitadel(id, newName);
      }
    },
  },
}
</script>

<style scoped>
.add-citadel {
  margin-bottom: 32px;
  display: flex;
}

.citadel-name {
  border: 1px dotted #514f4d;
  flex: 1;
  padding: 3px;
  color: #cdcdcd;
  background: transparent;
  font-size: 16px;
}

.add-citadel label {
  display: inline-block;
  vertical-align: middle;
  color: #a7a29c;
  height: auto;
  padding: 3px 0;
  margin-left: 10px;
}

.citadel-type,
.alliance-access,
.alliance-owned {
  background: transparent;
  border: 1px solid #514f4d;
  font-size: 14px;
  color: #a7a29c;
  background: transparent;
}

.citadel {
  display: flex;
  margin-bottom: 16px;
}

.name {
  flex: 1;
  border-top: 0;
  border-right: 0;
  border-left: 0;
  border-bottom: 1px dotted #514f4d;
  background: transparent;
  color: #cdcdcd;
  font-size: 16px;
}

.remove {
  border: 1px solid #a7a29c;
  background: transparent;
  color: #a7a29c;
}
</style>
