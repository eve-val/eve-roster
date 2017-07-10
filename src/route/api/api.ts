import express = require('express');

import account_activeTimezone_PUT from './account/activeTimezone_PUT';
import account_homeCitadel_PUT from './account/homeCitadel_PUT';
import account_mainCharacter_PUT from './account/mainCharacter_PUT';
import account_transfer_DELETE from './account/transfer_DELETE';
import account_transfer_POST from './account/transfer_POST';

import admin_accountLog from './admin/accountLog';
import admin_citadel_DELETE from './admin/citadel_DELETE';
import admin_citadel_POST from './admin/citadel_POST';
import admin_citadel_PUT from './admin/citadel_PUT';
import admin_setup_GET from './admin/setup_GET';
import admin_setup_PUT from './admin/setup_PUT';
import admin_tasks_job_PUT from './admin/tasks/job_PUT';
import admin_tasks_job from './admin/tasks/job';
import admin_tasks_logs from './admin/tasks/logs';
import admin_tasks_task from './admin/tasks/task';

import character from './character';
import character_character_PUT from './character/character_PUT';
import character_skillQueue from './character/skillQueue';
import character_skills from './character/skills';

import dashboard from './dashboard';
import dashboard_queueSummary from './dashboard/queueSummary';

import statistics_skills from './statistics/skills';

import roster from './roster';
import citadels from './citadels';
import corporation from './corporation';

const router = express.Router();

router.put('/account/:id/activeTimezone', account_activeTimezone_PUT);
router.put('/account/:id/homeCitadel', account_homeCitadel_PUT);
router.put('/account/:id/mainCharacter', account_mainCharacter_PUT);
router.post('/account/:id/transfer', account_transfer_POST);
router.delete('/account/:id/transfer/:charId', account_transfer_DELETE);

router.get('/admin/accountLog', admin_accountLog);
router.post('/admin/citadel', admin_citadel_POST);
router.put('/admin/citadel/:id', admin_citadel_PUT);
router.delete('/admin/citadel/:id', admin_citadel_DELETE);
router.get('/admin/setup/', admin_setup_GET);
router.put('/admin/setup/', admin_setup_PUT);
router.put('/admin/tasks/job', admin_tasks_job_PUT);
router.get('/admin/tasks/job', admin_tasks_job);
router.get('/admin/tasks/logs', admin_tasks_logs);
router.get('/admin/tasks/task', admin_tasks_task);

router.get('/character/:id', character);
router.put('/character/:id', character_character_PUT);
router.get('/character/:id/skills', character_skills);
router.get('/character/:id/skillQueue', character_skillQueue);

router.get('/dashboard', dashboard);
router.get('/dashboard/queueSummary', dashboard_queueSummary);

router.get('/statistics/skills', statistics_skills);

router.get('/roster', roster);
router.get('/citadels', citadels);
router.get('/corporation/:id', corporation);

export default router;