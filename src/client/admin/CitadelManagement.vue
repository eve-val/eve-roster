<template>
  <admin-wrapper title="Citadel management" :identity="identity">
    <div class="add-citadel">
      <input
        v-model="newCitadel.name"
        class="citadel-name"
        placeholder="Type a new citadel name, then press enter to add..."
        @keydown="addLogic"
      />
      <label
        >Type:
        <select v-model="newCitadel.type" class="citadel-type">
          <option value="Astrahus">Astrahus</option>
          <option value="Fortizar">Fortizar</option>
          <option value="Keepstar">Keepstar</option>
          <option value="Raitaru">Raitaru</option>
          <option value="Azbel">Azbel</option>
          <option value="Sotiyo">Sotiyo</option>
          <option value="Athanor">Athanor</option>
          <option value="Tatara">Tatara</option>
        </select>
      </label>
      <label
        >Alliance Access:
        <select v-model="newCitadel.allianceAccess" class="alliance-access">
          <option :value="true">YES</option>
          <option :value="false">NO</option>
        </select>
      </label>
      <label
        >Alliance Owned:
        <select v-model="newCitadel.allianceOwned" class="alliance-owned">
          <option :value="true">YES</option>
          <option :value="false">NO</option>
        </select>
      </label>
    </div>
    <div v-for="citadel in sortedCitadels" :key="citadel.id" class="citadel">
      <input
        class="name"
        :value="citadel.name"
        @blur="validate(citadel.id, citadel.name, $event)"
        @keydown="editLogic(citadel.name, $event)"
      />
      <button class="remove" @click="removeCitadel(citadel.id)">Remove</button>
    </div>
  </admin-wrapper>
</template>

<script lang="ts">
import ajaxer from "../shared/ajaxer";
import AdminWrapper from "./AdminWrapper.vue";

import { Citadel } from "./types";

import { hasValue, hasBlur } from "../shared/htmlUtil";
import { Identity } from "../home";

import { defineComponent, PropType } from "vue";
export default defineComponent({
  components: {
    AdminWrapper,
  },

  props: {
    identity: { type: Object as PropType<Identity>, required: true },
  },

  data() {
    return {
      citadels: [],
      newCitadel: {
        id: null,
        name: "",
        type: "Astrahus",
        allianceAccess: true,
        allianceOwned: true,
      },
    } as {
      citadels: Citadel[];
      newCitadel: Citadel;
    };
  },

  computed: {
    sortedCitadels: function (): Citadel[] {
      let sortedCitadels = this.citadels.slice();
      sortedCitadels.sort((a: Citadel, b: Citadel) => {
        return a.name.localeCompare(b.name);
      });
      return sortedCitadels;
    },
  },

  created: function () {
    this.fetchData();
  },

  methods: {
    fetchData() {
      ajaxer.getCitadels().then((response) => {
        this.citadels = response.data.citadels;
      });
    },

    addCitadel() {
      let c = this.newCitadel;
      ajaxer
        .postCitadel(c.name, c.type, c.allianceAccess, c.allianceOwned)
        .then((response) => {
          this.citadels.push(response.data);
          this.newCitadel.name = "";
        });
    },

    removeCitadel(id: number) {
      ajaxer.deleteCitadel(id).then((_response) => {
        for (let i = 0; i < this.citadels.length; i++) {
          if (this.citadels[i].id === id) {
            this.citadels.splice(i, 1);
            break;
          }
        }
      });
    },

    renameCitadel(id: number, name: string) {
      ajaxer.putCitadelName(id, name).then((_response) => {
        this.citadels.map((citadel: Citadel) => {
          if (citadel.id === id) {
            citadel.name = name;
          }
        });
      });
    },

    addLogic(event: KeyboardEvent) {
      // Check for editing finish
      if (event.which === /* Enter */ 13) {
        event.preventDefault();
        if (hasBlur(event.target)) {
          event.target.blur();
        }
        if (hasValue(event.target) && event.target.value) {
          this.addCitadel();
        }
      } else if (event.which === /* Esc */ 27) {
        event.preventDefault();
        if (hasValue(event.target)) {
          event.target.value = "";
        }
        if (hasBlur(event.target)) {
          event.target.blur();
        }
      }
    },

    editLogic(oldName: string, event: KeyboardEvent) {
      // Check for editing finish
      if (event.which === /* Enter */ 13) {
        event.preventDefault();
        if (hasBlur(event.target)) {
          event.target.blur();
        }
      } else if (event.which === /* Esc */ 27) {
        event.preventDefault();
        if (hasValue(event.target)) {
          event.target.value = oldName;
        }
        if (hasBlur(event.target)) {
          event.target.blur();
        }
      }
    },

    validate(id: number, name: string, event: KeyboardEvent) {
      this.editLogic(name, event);
      if (hasValue(event.target)) {
        let newName = event.target.value;
        if (newName !== name) {
          this.renameCitadel(id, newName);
        }
      }
    },
  },
});
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
