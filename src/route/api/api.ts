import express from "express";

import account_activeTimezone_PUT from "./account/activeTimezone_PUT";
import account_characters_GET from "./account/characters_GET";
import account_homeCitadel_PUT from "./account/homeCitadel_PUT";
import account_mainCharacter_PUT from "./account/mainCharacter_PUT";
import account_transfer_DELETE from "./account/transfer_DELETE";
import account_transfer_POST from "./account/transfer_POST";

import admin_accountLog from "./admin/accountLog";
import admin_citadel_DELETE from "./admin/citadel_DELETE";
import admin_citadel_POST from "./admin/citadel_POST";
import admin_citadel_PUT from "./admin/citadel_PUT";
import admin_roster_syncStatus_GET from "./admin/roster/syncStatus_GET";
import admin_setup_GET from "./admin/setup_GET";
import admin_setup_PUT from "./admin/setup_PUT";
import admin_srp_jurisdiction_GET from "./admin/srp/jurisdiction_GET";
import admin_srp_jurisdiction_PUT from "./admin/srp/jurisdiction_PUT";
import admin_tasks_job_PUT from "./admin/tasks/job_PUT";
import admin_tasks_job from "./admin/tasks/job";
import admin_tasks_logs from "./admin/tasks/logs";
import admin_tasks_task from "./admin/tasks/task";

import character from "./character";
import character_character_PUT from "./character/character_PUT";
import character_character_DELETE from "./character/character_DELETE";
import character_skills from "./character/skills";

import control_openwindow_information_POST from "./control/openwindow/information_POST";

import dashboard from "./dashboard";
import dashboard_queueSummary from "./dashboard/queueSummary";

import killmail_GET from "./killmail/killmail_GET";

import ships_borrowedByMe from "./ships/borrowedByMe";
import ships_borrowed from "./ships/borrowed";

import srp_approvedLiability_GET from "./srp/approvedLiability_GET";
import srp_battle_dir_GET from "./srp/battle/battle_dir_GET";
import srp_battle_GET from "./srp/battle/battle_GET";
import srp_loss_dir_GET from "./srp/loss/loss_dir_GET";
import srp_loss_PUT from "./srp/loss/loss_PUT";
import srp_loss_triage_GET from "./srp/loss/triage_GET";
import srp_payment_dir_GET from "./srp/payment/payment_dir_GET";
import srp_payment_GET from "./srp/payment/payment_GET";
import srp_payment_PUT from "./srp/payment/payment_PUT";

import statistics_skills from "./statistics/skills";

import roster from "./roster";
import citadels from "./citadels";
import corporation from "./corporation";

const router = express.Router();

router.put("/account/:id/activeTimezone", account_activeTimezone_PUT);
router.get("/account/:id/characters", account_characters_GET);
router.put("/account/:id/homeCitadel", account_homeCitadel_PUT);
router.put("/account/:id/mainCharacter", account_mainCharacter_PUT);
router.post("/account/:id/transfer", account_transfer_POST);
router.delete("/account/:id/transfer/:charId", account_transfer_DELETE);

router.get("/admin/accountLog", admin_accountLog);
router.post("/admin/citadel", admin_citadel_POST);
router.put("/admin/citadel/:id", admin_citadel_PUT);
router.delete("/admin/citadel/:id", admin_citadel_DELETE);
router.get("/admin/roster/syncStatus", admin_roster_syncStatus_GET);
router.get("/admin/setup/", admin_setup_GET);
router.put("/admin/setup/", admin_setup_PUT);
router.get("/admin/srp/jurisdiction", admin_srp_jurisdiction_GET);
router.put("/admin/srp/jurisdiction", admin_srp_jurisdiction_PUT);
router.put("/admin/tasks/job", admin_tasks_job_PUT);
router.get("/admin/tasks/job", admin_tasks_job);
router.get("/admin/tasks/logs", admin_tasks_logs);
router.get("/admin/tasks/task", admin_tasks_task);

router.get("/character/:id", character);
router.put("/character/:id", character_character_PUT);
router.delete("/character/:id", character_character_DELETE);
router.get("/character/:id/skills", character_skills);

router.post(
  "/control/openwindow/information",
  control_openwindow_information_POST
);

router.get("/dashboard", dashboard);
router.get("/dashboard/queueSummary", dashboard_queueSummary);

router.get("/killmail/:id", killmail_GET);

router.get("/ships/borrowedByMe", ships_borrowedByMe);
router.get("/ships/borrowed", ships_borrowed);

router.get("/srp/approvedLiability", srp_approvedLiability_GET);
router.get("/srp/battle", srp_battle_dir_GET);
router.get("/srp/battle/:id", srp_battle_GET);
router.get("/srp/loss", srp_loss_dir_GET);
router.put("/srp/loss/:id", srp_loss_PUT);
router.get("/srp/loss/:id/triage", srp_loss_triage_GET);
router.get("/srp/payment", srp_payment_dir_GET);
router.get("/srp/payment/:id", srp_payment_GET);
router.put("/srp/payment/:id", srp_payment_PUT);

router.get("/statistics/skills", statistics_skills);

router.get("/roster", roster);
router.get("/citadels", citadels);
router.get("/corporation/:id", corporation);

export default router;
