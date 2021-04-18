<template>
  <div class="pips">
    <div
      v-for="i in 5"
      class="pip"
      :class="{
        trained: i <= trainedLevel,
        queued: i > trainedLevel && i <= queuedLevel,
      }"
    ></div>
  </div>
</template>

<script>
export default {
  props: {
    trainedLevel: { type: Number, required: true },
    queuedLevel: { type: Number, required: true },
  },
};
</script>

<style scoped>
.pips {
  display: flex;
}

.pip {
  width: 10px;
  height: 10px;
  background: #4d4d4e;
}

.pip + .pip {
  margin-left: 2px;
}

.trained {
  background: #cccccc;
}

.queued {
  background: #2c859f;
}
</style>
