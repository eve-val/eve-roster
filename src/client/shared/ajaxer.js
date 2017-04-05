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

  putAccountHomeCitadel(accountId, citadelName) {
    return axios.put('/api/account/' + accountId + '/homeCitadel', {
      citadelName: citadelName,
    });
  },

  putAccountActiveTimezone(accountId, activeTimezone) {
    return axios.put('/api/account/' + accountId + '/activeTimezone', {
      activeTimezone: activeTimezone,
    });
  },

  putCharacterIsOpsec(characterId, isOpsec) {
    return axios.put(`/api/character/${characterId}`, {
      opsec: isOpsec
    });
  },

  postCharacterTransfer(accountId, characterId) {
    return axios.post(`/api/account/${accountId}/transfer`, {
      characterId: characterId,
    });
  },

  deleteCharacterTransfer(accountId, characterId) {
    return axios.delete(`/api/account/${accountId}/transfer/${characterId}`);
  },

  getRoster() {
    return axios.get('/api/roster');
  },

  getCharacter(id) {
    return axios.get('/api/character/' + id);
  },

  getCitadels() {
    return axios.get('/api/citadels');
  },

  postCitadel(name, type, allianceAccess, allianceOwned) {
    return axios.post('/api/admin/citadel', {
      name: name,
      type: type,
      allianceAccess: parseInt(allianceAccess),
      allianceOwned: parseInt(allianceOwned),
    });
  },

  putCitadelName(citadelId, name) {
    return axios.put(`/api/admin/citadel/${citadelId}`, {
      name: name
    });
  },

  deleteCitadel(citadelId) {
    return axios.delete(`/api/admin/citadel/${citadelId}`);
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

  getAdminAccountLog() {
    return axios.get('/api/admin/accountLog');
  },

  getAdminCronLog() {
    return axios.get('/api/admin/cronLog');
  },

  getAdminSetup() {
    return axios.get('/api/admin/setup');
  },

  putAdminSetup(setupObj) {
    return axios.put('/api/admin/setup', setupObj);
  },
}
