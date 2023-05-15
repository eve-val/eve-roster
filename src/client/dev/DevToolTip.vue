<template>
  <div class="_dev-tooltip">
    <div>
      <div class="wrapper">
        <tool-tip gravity="right" dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message> This is a short message </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="right" inline dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message>
            This is a much longer message that is intended to both fill the
            maximum width and also eclipse the corresponding dimension of the
            referent content.
          </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="left center" dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message> This is a short message </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="top" dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message> This is a short message </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="bottom center" dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message> This is a short message </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="top start" dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message> This is a short message </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="right end" dev-force-open>
          <template #default>
            <div class="primaryContent">Primary content</div>
          </template>
          <template #message>
            This is a much longer message that is intended to both fill the
            maximum width and also eclipse the corresponding dimension of the
            referent content.
          </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="left start" dev-force-open>
          <template #default>
            <div class="tinyContent"></div>
          </template>
          <template #message>
            This is a much longer message that is intended to both fill the
            maximum width and also eclipse the corresponding dimension of the
            referent content.
          </template>
        </tool-tip>
      </div>

      <div class="wrapper">
        <tool-tip gravity="top center" inline dev-force-open>
          <template #default>
            <div class="inlineContent">123</div>
          </template>
          <template #message>
            This is a much longer message that is intended to both fill the
            maximum width and also eclipse the corresponding dimension of the
            referent content.
          </template>
        </tool-tip>
      </div>
    </div>
  </div>
</template>

<script lang="ts">
import { defineComponent } from "vue";
import ToolTip from "../shared/ToolTip.vue";

export default defineComponent({
  components: {
    ToolTip,
  },
});
</script>

<style scoped>
.wrapper {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 500px;
  height: 180px;
}

.primaryContent {
  padding: 15px;
  background-color: rgb(117, 92, 43);
}

.tinyContent {
  width: 5px;
  height: 5px;
  background-color: #812424;
}

.inlineContent {
  display: inline;
  border: 1px solid red;
}
</style>
