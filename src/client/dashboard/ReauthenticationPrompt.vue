<template>
<div class="_reauthentication-prompt"
    >
  <div class="cnt-left">
    <div class="bother-title">Character needs to be reauthorized.</div>
    Log in as "{{ characterName }}".
  </div>
  <div class="cnt-right">
    <a class="reauth-btn roster-btn"
        :href="'https://login.eveonline.com/oauth/authorize?' + loginParams"
        >Reauthorize</a>
  </div>
</div>
</template>

<script>
export default {
  props: {
    loginParams: { type: String, required: true },
    characterName: { type: String, required: true },
  }
}
</script>

<style scoped>
._reauthentication-prompt {
  background: #c5751d;
  padding: 12px;
  display: flex;
}

.cnt-left {
  flex: 1;
  color: #212121;
}

.cnt-right {
  margin-left: 20px;
  align-self: center;
}

.bother-title {
  font-size: 16px;
  margin-bottom: 6px;
  color: #000;
}

.reauth-btn {
  display: inline-block;
  text-decoration: none;
  color: #cdcdcd;
  padding: 7px 12px;
  border-color: #462917;
  border-radius: 2px;
}
</style>
