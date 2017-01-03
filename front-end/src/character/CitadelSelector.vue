<template>
<div class="_citadel-selector">
  <select class="selector" v-model="citadelId">
    <option value="-1"
        :selected="citadelId == null"
        >Not assigned</option>
    <option v-for="citadel in citadels"
        :selected="citadel.id == citadelId"
        :value="citadel.id"
        >
      {{ citadel.name }}
    </option>
  </select>
  <!-- TODO: Non-shitty loading indicator... -->
  <span class="message"
      :style="{ color: requestStatus == 'error' ? 'red' : undefined }"
      >{{ requestStatus }}</span>
</div>
</template>

<script>
import axios from 'axios';

export default {
  props: {
    accountId: { type: Number, required: true },
    initialCitadel: { type: Number, required: false },
    citadels: { type: Array, required: true },
  },

  data: function() {
    return {
      citadelId: this.initialCitadel == null ? -1 : this.initialCitadel,
      requestStatus: null,
    };
  },

  watch: {
    citadelId: function(value) {
      let id = value == -1 ? null : value;
      this.requestStatus = 'loading';
      axios.put('/api/account/' + this.accountId + '/homeCitadel', {
        citadelId: id,
      })
      .then(response => {
        this.requestStatus = null;
      })
      .catch(e => {
        console.log('Error :(', e);
        this.requestStatus = 'error';
      });
    },
  },
}
</script>

<style scoped>
._citadel-selector {
  margin-top: 4px;
}

.selector {
  width: 200px;
}

.message {
  font-size: 10px;
  color: #8d785f;
  margin-left: 5px;
}
</style>
