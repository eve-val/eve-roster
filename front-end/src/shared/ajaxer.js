import axios from 'axios';

let rosterJson = {};
if (__DEV__) {
  rosterJson = require('../../api/roster.json')
}

export default {
  fetchRoster() {
    if (__DEV__) {
      return fakeResponse(rosterJson);
    } else {
      return axios.get('/api/roster');
    }
  },

  updatePilot(name, props) {
    if (__DEV__) {
      return fakeResponse('');
    } else {
      return axios.patch(
          '/api/' + encodeURIComponent(name),
          JSON.stringify(props),
      );
    }
  },
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