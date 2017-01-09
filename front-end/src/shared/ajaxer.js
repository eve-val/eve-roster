import axios from 'axios';

export default {
  getDashboard() {
    return axios.get('/api/dashboard');
  },

  getCorporation(id) {
    return axios.get('/api/corporation/' + id);
  },

  putAccountMainCharacter(accountId, characterId) {
    return axios.put(`/api/account/${accountId}/mainCharacter`, {
      characterId: characterId,
    });
  },

  getRoster() {
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
}
