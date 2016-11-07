import Vue from 'vue'
import App from './App.vue'

console.log('Hello from other!');

new Vue({
  el: '#app',
  render: h => h(App)
});
