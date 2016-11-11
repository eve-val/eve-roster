<template>
  <div class="header">
    <div class="title">SOUND Roster</div>
    <div class="identity">Bloodstripes</div>
  </div>
</template>

<script>
export default {
  props: {
    identity: {
      type: Object,
      required: true
    }
  }
}
</script>

<style scoped>
.header {
  display: flex;
  flex-direction: row;
  align-items: center;
  height: 40px;
  background: #EEE;
}

.title {
  flex-grow: 1;
  padding-left: 15px;
  font-size: 18px;
}

.identity {
  padding-right: 15px;
  font-size: 14px;
}

</style>