import Vue from 'vue'
import Home from './home/Home.vue'

console.log('Hello from home!');

new Vue({
  el: '#app',
  render: h => h(Home)
})
