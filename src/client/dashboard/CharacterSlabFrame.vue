<template>
  <div class="slab-root">
    <div class="slab-main">
      <eve-image :id="characterId" :size="105" type="Character" />
      <div class="body">
        <slot></slot>
      </div>
    </div>
    <slot name="sub-slab-hanger"></slot>
  </div>
</template>

<script>
import EveImage from "../shared/EveImage.vue";

export default {
  components: {
    EveImage,
  },

  props: {
    characterId: { type: Number, required: true },
  },
};
</script>

<style scoped>
.slab-root {
  width: 480px;
}

.slab-main {
  border: 1px solid #2d2318;
  background: #101010;
  height: 105px;
  display: flex;
  position: relative;
  user-select: none;
  cursor: default;

  transition: box-shadow 250ms cubic-bezier(0.215, 0.61, 0.355, 1);
}

.slab-main:hover {
  border-color: #352d24;
}

.body {
  flex: 1;
}
</style>
