<template>
  <img class="roster-portrait" :src="portraitSrc">
</template>

<script>

export default {
  props: {
    characterId: {
      type: Number,
      required: true,
    },
  },

  computed: {
    portraitSrc: function() {
      return '//image.eveonline.com/Character/' + this.characterId + 
          '_32.jpg';
    }
  }
}
</script>

<style>
.roster-portrait {
  width: 32px;
  height: 32px;
}

</style>