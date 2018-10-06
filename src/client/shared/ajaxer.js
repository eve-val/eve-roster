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

  getAccountCharacters(accountId) {
    return axios.get(`/api/account/${accountId}/characters`);
  },

  deleteBiomassedCharacter(characterId) {
    return axios.delete('/api/character/' + characterId);
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
      allianceAccess: allianceAccess,
      allianceOwned: allianceOwned,
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

  getFreshSkillQueueSummaries() {
    return axios.get('/api/dashboard/queueSummary');
  },

  getAdminRosterSyncStatus() {
    return axios.get('/api/admin/roster/syncStatus')
  },

  getAdminAccountLog() {
    return axios.get('/api/admin/accountLog');
  },

  getAdminTasks() {
    return axios.get('/api/admin/tasks/task');
  },

  getAdminJobs() {
    return axios.get('/api/admin/tasks/job');
  },

  putAdminTask(taskName) {
    return axios.put('/api/admin/tasks/job', {
      task: taskName,
    });
  },

  getAdminTaskLog() {
    return axios.get('/api/admin/tasks/logs');
  },

  getAdminSetup() {
    return axios.get('/api/admin/setup');
  },

  putAdminSetup(setupObj) {
    return axios.put('/api/admin/setup', setupObj);
  },

  getAdminSrpJurisdiction() {
    return axios.get('/api/admin/srp/jurisdiction');
  },

  putAdminSrpJurisdiction(start) {
    return axios.put('/api/admin/srp/jurisdiction', {
      start: start,
    });
  },

  getSrpApprovedLiability() {
    return axios.get('/api/srp/approvedLiability');
  },

  getBattles(filter, includeSrp) {
    return axios.get('/api/srp/battle', {
      params: {
        filter: filter != undefined ? JSON.stringify(filter) : undefined,
        includeSrp: includeSrp,
      },
    });
  },

  getBattle(id, includeSrp) {
    return axios.get(`/api/srp/battle/${id}`, {
      params: {
        includeSrp: includeSrp,
      },
    });
  },

  getRecentSrpLosses(filter) {
    return axios.get('/api/srp/loss', {
      params: filter
    });
  },

  putSrpLossVerdict(killmail, verdict, reason, payout) {
    return axios.put(`/api/srp/loss/${killmail}`, {
      verdict: verdict,
      reason: reason,
      payout: payout,
    });
  },

  getSrpLossTriageOptions(killmail) {
    return axios.get(`/api/srp/loss/${killmail}/triage`);
  },

  getSrpPaymentHistory(filter) {
    return axios.get('/api/srp/payment', {
      params: filter
    });
  },

  getSrpPayment(paymentId) {
    return axios.get(`/api/srp/payment/${paymentId}`);
  },

  putSrpPaymentStatus(srp, paid, payingCharacter) {
    return axios.put(`/api/srp/payment/${srp}`, {
      paid: paid,
      payingCharacter: payingCharacter,
    });
  },

  postOpenInformationWindow(character, targetId) {
    return axios.post(`/api/control/openwindow/information`, {
      character: character,
      targetId: targetId,
    });
  },
}
