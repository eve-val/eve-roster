import { default as axios, AxiosResponse } from "axios";
import { Admin_Roster_SyncStatus_GET } from "../../shared/route/api/admin/roster/syncStatus_GET.js";
import { Dashboard_GET } from "../../shared/route/api/dashboard_GET.js";
import { Character_GET } from "../../shared/route/api/character_GET.js";
import { Task, Job, Log, Citadel } from "../admin/types.js";
import { Account } from "../roster/types.js";
import { Account_Characters_GET } from "../../shared/route/api/account/characters_GET.js";
import { Character_Skills_GET } from "../../shared/route/api/character/skills_GET.js";
import { Ship } from "../ships/ships.js";
import { Srp_Battle_GET } from "../../shared/route/api/srp/battle/battle_GET.js";
import { Srp_Loss_GET } from "../../shared/route/api/srp/loss_GET.js";
import { Srp_Payment_GET } from "../../shared/route/api/srp/payment/payment_GET.js";
import { Srp_Payment_dir_GET } from "../../shared/route/api/srp/payment/payment_dir_GET.js";
import { SrpTriageJson } from "../../shared/types/srp/SrpLossJson.js";

export function configureCsrfInterceptor(token: string) {
  axios.interceptors.request.use(
    (req) => {
      // TODO: if we do remote fetch, avoid leaking csrf token to other host.
      req.headers["x-csrf-token"] = token;
      return req;
    },
    (error) => Promise.reject(error),
  );
}

export default {
  getDashboard() {
    return axios.get<Dashboard_GET>("/api/dashboard");
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
    return axios.get<Account_Characters_GET>(
      `/api/account/${accountId}/characters`,
    );
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
    return axios.get<{ columns: string[]; rows: Account[] }>("/api/roster");
  },

  getCharacter(id: number) {
    return axios.get<Character_GET>("/api/character/" + id);
  },

  getCitadels() {
    return axios.get<{ citadels: Citadel[] }>("/api/citadels");
  },

  postCitadel(
    name: string,
    type: string,
    allianceAccess: boolean,
    allianceOwned: boolean,
  ) {
    return axios.post<Citadel>("/api/admin/citadel", {
      name: name,
      type: type,
      allianceAccess: allianceAccess,
      allianceOwned: allianceOwned,
    });
  },

  putCitadelName(citadelId: number, name: string) {
    return axios.put<{}>(`/api/admin/citadel/${citadelId}`, {
      name: name,
    });
  },

  deleteCitadel(citadelId: number) {
    return axios.delete<{}>(`/api/admin/citadel/${citadelId}`);
  },

  getSkills(id: number) {
    return axios.get<Character_Skills_GET>("/api/character/" + id + "/skills");
  },

  getSkillQueue(id: number) {
    return axios.get<any>("/api/character/" + id + "/skillQueue");
  },

  getFreshSkillQueueSummaries() {
    return axios.get<any>("/api/dashboard/queueSummary");
  },

  getAdminRosterSyncStatus() {
    return axios.get<Admin_Roster_SyncStatus_GET>(
      "/api/admin/roster/syncStatus",
    );
  },

  getAdminAccountLog() {
    return axios.get<{ rows: any[] }>("/api/admin/accountLog");
  },

  getAdminTasks() {
    return axios.get<Task[]>("/api/admin/tasks/task");
  },

  getAdminJobs() {
    return axios.get<Job[]>("/api/admin/tasks/job");
  },

  putAdminTask(taskName: string) {
    return axios.put("/api/admin/tasks/job", {
      task: taskName,
    });
  },

  getAdminTaskLog() {
    return axios.get<Log[]>("/api/admin/tasks/logs");
  },

  getAdminSetup() {
    return axios.get<string>("/api/admin/setup");
  },

  putAdminSetup(setupObj: string) {
    return axios.put("/api/admin/setup", setupObj);
  },

  getAdminSrpJurisdiction() {
    return axios.get<{ srpJurisdiction: { start?: number } }>(
      "/api/admin/srp/jurisdiction",
    );
  },

  putAdminSrpJurisdiction(start: number) {
    return axios.put("/api/admin/srp/jurisdiction", {
      start: start,
    });
  },

  getSrpApprovedLiability() {
    return axios.get<{ approvedLiability: number }>(
      "/api/srp/approvedLiability",
    );
  },

  getBattles(filter: Object, includeSrp: boolean) {
    return axios.get<Srp_Battle_GET>("/api/srp/battle", {
      params: {
        filter: filter != undefined ? JSON.stringify(filter) : undefined,
        includeSrp: includeSrp,
      },
    });
  },

  getBattle(id: number, includeSrp: boolean) {
    return axios.get<Srp_Battle_GET>(`/api/srp/battle/${id}`, {
      params: {
        includeSrp: includeSrp,
      },
    });
  },

  getRecentSrpLosses(filter: Object) {
    return axios.get<Srp_Loss_GET>("/api/srp/loss", {
      params: filter,
    });
  },

  putSrpLossVerdict(
    killmail: number,
    verdict: string,
    reason: string | null,
    tag: string | null,
    payout: number,
  ) {
    return axios.put<{ id: number; name: string }>(
      `/api/srp/loss/${killmail}`,
      {
        verdict,
        reason,
        tag,
        payout,
      },
    );
  },

  getSrpLossTriageOptions(killmail: number) {
    return axios.get<{ triage: SrpTriageJson }>(
      `/api/srp/loss/${killmail}/triage`,
    );
  },

  getSrpPaymentHistory(filter: Object) {
    return axios.get<Srp_Payment_dir_GET>("/api/srp/payment", {
      params: filter,
    });
  },

  getSrpPayment(paymentId: number) {
    return axios.get<Srp_Payment_GET>(`/api/srp/payment/${paymentId}`);
  },

  putSrpPaymentStatus(
    srp: number,
    paid: boolean,
    payingCharacter: number | undefined,
  ): Promise<AxiosResponse<{}>> {
    return axios.put<{}>(`/api/srp/payment/${srp}`, {
      paid: paid,
      payingCharacter: payingCharacter,
    });
  },

  getAllBorrowedShips() {
    return axios.get<Ship[]>("/api/ships/borrowed");
  },

  getShipsBorrowedByMe() {
    return axios.get<Ship[]>("/api/ships/borrowedByMe");
  },

  postOpenInformationWindow(character: number, targetId: number) {
    return axios.post(`/api/control/openwindow/information`, {
      character: character,
      targetId: targetId,
    });
  },
};
