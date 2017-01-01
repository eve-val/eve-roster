import axios from 'axios';

export default {
  getDashboard() {
    return axios.get('/api/dashboard');
  },

  getCorporation(id) {
    return axios.get('/api/corporation/' + id);
  },

  putApiKey(characterId, keyId, keyVerification) {
    return axios.put('/api/character/' + characterId + '/apikey', {
      keyId: keyId,
      keyVerification: keyVerification,
    });
  },

  fetchRoster() {
    return axios.get('/api/roster');
  },

  getCharacter(id) {
    return axios.get('/api/character/' + id);
  },

  getSkills(id) {
    return axios.get('/api/character/' + id + '/skills');
  },

  getSkillQueue(id) {
    return axios.get('/api/character/' + id + '/skillQueue');
  },

  getSkillQueueSummary(id) {
    return axios.get('/api/dashboard/' + id + '/queueSummary');
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