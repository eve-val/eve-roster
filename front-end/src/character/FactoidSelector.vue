<template>
<div class="factoid-selector">
  <select class="selector" v-model="selectedValue">
    <option :value="null">
      Not assigned
    </option>
    <option v-for="option in options"
        :value="option.value"
        >
      {{ option.label }}
    </option>
  </select>
  <!-- TODO: Non-shitty loading indicator... -->
  <span class="message"
      :style="{ color: requestStatus == 'error' ? 'red' : undefined }"
      >{{ requestStatus }}</span>
</div>
</template>

<script>
export default {
  props: {
    options: { type: Array, required: true },
    initialValue: { type: String, required: false },
    submitHandler: { type: Function, required: true },
  },

  data: function() {
    return {
      selectedValue: this.initialValue,
      requestStatus: null,
    };
  },

  watch: {
    selectedValue: function(value) {
      console.log('Value!', value);
      this.requestStatus = 'loading';
      this.submitHandler(value || null)
      // value = value || null; // Strip out 
      // let id = value == -1 ? null : value;
      // this.requestStatus = 'loading';
      // axios.put('/api/account/' + this.accountId + '/homeCitadel', {
      //   citadelId: id,
      // })
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
.factoid-selector {
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
