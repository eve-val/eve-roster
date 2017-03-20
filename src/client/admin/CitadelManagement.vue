<template>
<admin-wrapper title="Citadel management" :identity="identity">
<div v-for="citadel in sortedCitadels" class="citadel">
  <span class="name" contenteditable
    @blur="validate(citadel.id, citadel.name, $event)"
    @keydown="editLogic(citadel.name, $event)"
  >{{ citadel.name }}</span>

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

    editLogic(oldName, event) {
      let text = event.target.innerText;

      // Enforce single line only
      text = text.split("\n")[0];
      if(text !== event.target.innerText) {
        event.target.innerText = text;
      }

      // Check for editing finish
      if(event.which === /* Enter */ 13) {
        event.preventDefault();
        event.target.blur();
      } else if(event.which === /* Esc */ 27) {
        event.preventDefault();
        event.target.innerText = oldName;
        event.target.blur();
      }
    },

    validate(id, name, event) {
      this.editLogic(name, event);
      let newName = event.target.innerText;
      if(newName !== name) {
        this.renameCitadel(id, newName);
      }
    },
  },
}
</script>

<style scoped>
.citadel {
  display: flex;
  margin-bottom: 16px;
}

.name {
  flex: 1;
  border-bottom: 1px dotted #514f4d;
}

.remove {
  border: 1px solid #a7a29c;
  background: transparent;
  color: #a7a29c;
}
</style>
