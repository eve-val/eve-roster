import express from "express";

import account_activeTimezone_PUT from "./account/activeTimezone_PUT.js";
import account_characters_GET from "./account/characters_GET.js";
import account_homeCitadel_PUT from "./account/homeCitadel_PUT.js";
import account_mainCharacter_PUT from "./account/mainCharacter_PUT.js";
import account_transfer_DELETE from "./account/transfer_DELETE.js";
import account_transfer_POST from "./account/transfer_POST.js";

import admin_accountLog from "./admin/accountLog.js";
import admin_citadel_DELETE from "./admin/citadel_DELETE.js";
import admin_citadel_POST from "./admin/citadel_POST.js";
import admin_citadel_PUT from "./admin/citadel_PUT.js";
import admin_roster_syncStatus_GET from "./admin/roster/syncStatus_GET.js";
import admin_setup_GET from "./admin/setup_GET.js";
import admin_setup_PUT from "./admin/setup_PUT.js";
import admin_srp_jurisdiction_GET from "./admin/srp/jurisdiction_GET.js";
import admin_srp_jurisdiction_PUT from "./admin/srp/jurisdiction_PUT.js";
import admin_tasks_job_PUT from "./admin/tasks/job_PUT.js";
import admin_tasks_job from "./admin/tasks/job.js";
import admin_tasks_logs from "./admin/tasks/logs.js";
import admin_tasks_task from "./admin/tasks/task.js";

import character from "./character.js";
import character_character_PUT from "./character/character_PUT.js";
import character_character_DELETE from "./character/character_DELETE.js";
import character_skills from "./character/skills.js";

import control_openwindow_information_POST from "./control/openwindow/information_POST.js";

import dashboard from "./dashboard.js";
import dashboard_queueSummary from "./dashboard/queueSummary.js";

import killmail_GET from "./killmail/killmail_GET.js";

import ships_borrowedByMe from "./ships/borrowedByMe.js";
import ships_borrowed from "./ships/borrowed.js";

import srp_approvedLiability_GET from "./srp/approvedLiability_GET.js";
import srp_battle_dir_GET from "./srp/battle/battle_dir_GET.js";
import srp_battle_GET from "./srp/battle/battle_GET.js";
import srp_loss_dir_GET from "./srp/loss/loss_dir_GET.js";
import srp_loss_PUT from "./srp/loss/loss_PUT.js";
import srp_loss_triage_GET from "./srp/loss/triage_GET.js";
import srp_payment_dir_GET from "./srp/payment/payment_dir_GET.js";
import srp_payment_GET from "./srp/payment/payment_GET.js";
import srp_payment_PUT from "./srp/payment/payment_PUT.js";

import statistics_skills from "./statistics/skills.js";

import roster from "./roster.js";
import citadels from "./citadels.js";

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

export default router;
