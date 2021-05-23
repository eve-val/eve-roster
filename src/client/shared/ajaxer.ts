import axios from "axios";

export default {
  getDashboard() {
    return axios.get("/api/dashboard");
  },

  getCorporation(id: number) {
    return axios.get("/api/corporation/" + id);
  },

  putAccountMainCharacter(accountId: number, characterId: number) {
    return axios.put(`/api/account/${accountId}/mainCharacter`, {
      characterId: characterId,
    });
  },

  putAccountHomeCitadel(accountId: number, citadelName: string) {
    return axios.put("/api/account/" + accountId + "/homeCitadel", {
      citadelName: citadelName,
    });
  },

  putAccountActiveTimezone(accountId: number, activeTimezone: string) {
    return axios.put("/api/account/" + accountId + "/activeTimezone", {
      activeTimezone: activeTimezone,
    });
  },

  getAccountCharacters(accountId: number) {
    return axios.get(`/api/account/${accountId}/characters`);
  },

  deleteBiomassedCharacter(characterId: number) {
    return axios.delete("/api/character/" + characterId);
  },

  putCharacterIsOpsec(characterId: number, isOpsec: boolean) {
    return axios.put(`/api/character/${characterId}`, {
      opsec: isOpsec,
    });
  },

  postCharacterTransfer(accountId: number, characterId: number) {
    return axios.post(`/api/account/${accountId}/transfer`, {
      characterId: characterId,
    });
  },

  deleteCharacterTransfer(accountId: number, characterId: number) {
    return axios.delete(`/api/account/${accountId}/transfer/${characterId}`);
  },

  getRoster() {
    return axios.get("/api/roster");
  },

  getCharacter(id: number) {
    return axios.get("/api/character/" + id);
  },

  getCitadels() {
    return axios.get("/api/citadels");
  },

  postCitadel(
    name: string,
    type: string,
    allianceAccess: boolean,
    allianceOwned: boolean
  ) {
    return axios.post("/api/admin/citadel", {
      name: name,
      type: type,
      allianceAccess: allianceAccess,
      allianceOwned: allianceOwned,
    });
  },

  putCitadelName(citadelId: number, name: string) {
    return axios.put(`/api/admin/citadel/${citadelId}`, {
      name: name,
    });
  },

  deleteCitadel(citadelId: number) {
    return axios.delete(`/api/admin/citadel/${citadelId}`);
  },

  getSkills(id: number) {
    return axios.get("/api/character/" + id + "/skills");
  },

  getSkillQueue(id: number) {
    return axios.get("/api/character/" + id + "/skillQueue");
  },

  getFreshSkillQueueSummaries() {
    return axios.get("/api/dashboard/queueSummary");
  },

  getAdminRosterSyncStatus() {
    return axios.get("/api/admin/roster/syncStatus");
  },

  getAdminAccountLog() {
    return axios.get("/api/admin/accountLog");
  },

  getAdminTasks() {
    return axios.get("/api/admin/tasks/task");
  },

  getAdminJobs() {
    return axios.get("/api/admin/tasks/job");
  },

  putAdminTask(taskName: string) {
    return axios.put("/api/admin/tasks/job", {
      task: taskName,
    });
  },

  getAdminTaskLog() {
    return axios.get("/api/admin/tasks/logs");
  },

  getAdminSetup() {
    return axios.get("/api/admin/setup");
  },

  putAdminSetup(setupObj) {
    return axios.put("/api/admin/setup", setupObj);
  },

  getAdminSrpJurisdiction() {
    return axios.get("/api/admin/srp/jurisdiction");
  },

  putAdminSrpJurisdiction(start: number) {
    return axios.put("/api/admin/srp/jurisdiction", {
      start: start,
    });
  },

  getSrpApprovedLiability() {
    return axios.get("/api/srp/approvedLiability");
  },

  getBattles(filter: Object, includeSrp: boolean) {
    return axios.get("/api/srp/battle", {
      params: {
        filter: filter != undefined ? JSON.stringify(filter) : undefined,
        includeSrp: includeSrp,
      },
    });
  },

  getBattle(id: number, includeSrp: boolean) {
    return axios.get(`/api/srp/battle/${id}`, {
      params: {
        includeSrp: includeSrp,
      },
    });
  },

  getRecentSrpLosses(filter: Object) {
    return axios.get("/api/srp/loss", {
      params: filter,
    });
  },

  putSrpLossVerdict(
    killmail: number,
    verdict: string,
    reason: string,
    payout: number
  ) {
    return axios.put(`/api/srp/loss/${killmail}`, {
      verdict: verdict,
      reason: reason,
      payout: payout,
    });
  },

  getSrpLossTriageOptions(killmail: number) {
    return axios.get(`/api/srp/loss/${killmail}/triage`);
  },

  getSrpPaymentHistory(filter: Object) {
    return axios.get("/api/srp/payment", {
      params: filter,
    });
  },

  getSrpPayment(paymentId: number) {
    return axios.get(`/api/srp/payment/${paymentId}`);
  },

  putSrpPaymentStatus(srp: number, paid: number, payingCharacter: number) {
    return axios.put(`/api/srp/payment/${srp}`, {
      paid: paid,
      payingCharacter: payingCharacter,
    });
  },

  getAllBorrowedShips() {
    return axios.get("/api/ships/borrowed");
  },

  getShipsBorrowedByMe() {
    return axios.get("/api/ships/borrowedByMe");
  },

  postOpenInformationWindow(character: number, targetId: number) {
    return axios.post(`/api/control/openwindow/information`, {
      character: character,
      targetId: targetId,
    });
  },
};
