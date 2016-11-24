import axios from 'axios';

console.log('DEV is: ' + __DEV__);

let rosterJson = {};
if (__DEV__) {
  rosterJson = require('../../api/roster.json')
  console.log('rosterJson is', rosterJson);
}

export default {
  fetchRoster() {
    if (__DEV__) {
      return fakeResponse(rosterJson);
    } else {
      return axios.get('/api/roster');
    }
  }
}

function fakeResponse(data) {
  return new Promise((resolve, reject) => {
    setTimeout(() => {
      resolve({
        data: data,
        status: 200,
        statusText: 'OK',
        headers: {},
        config: {},
      });
    }, 1000);
  }); 
}