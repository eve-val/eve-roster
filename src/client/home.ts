import * as Sentry from "@sentry/browser";
import "./sentry";

import { createApp } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import "./css/home.css";
import HomePage from "./HomePage.vue";

import CharacterDashboard from "./dashboard/CharacterDashboard.vue";
import CharacterSheet from "./character/CharacterSheet.vue";
import RosterList from "./roster/RosterList.vue";

import AdminOverview from "./admin/AdminOverview.vue";
import AccountLog from "./admin/AccountLog.vue";
import ApiAudit from "./admin/ApiAudit.vue";
import AdminSetup from "./admin/AdminSetup.vue";
import TaskControl from "./admin/TaskControl.vue";
import JobDetail from "./admin/JobDetail.vue";
import CitadelManagement from "./admin/CitadelManagement.vue";
import DevPreview from "./dev/DevPreview.vue";

import KillmailDetail from "./killmail/KillmailDetail.vue";

import ShipReplacement from "./srp/ShipReplacement.vue";
import SrpDashboard from "./srp/SrpDashboard.vue";
import CombatHistory from "./srp/CombatHistory.vue";
import SrpExportPage from "./srp/SrpExportPage.vue";
import PaymentHistory from "./srp/PaymentHistory.vue";
import PaymentTriage from "./srp/PaymentTriage.vue";
import PaymentDetail from "./srp/PaymentDetail.vue";
import BattleDetail from "./srp/battles/BattleDetail.vue";

import ShipsBorrowedByMe from "./ships/ShipsBorrowedByMe.vue";
import AllBorrowedShips from "./ships/AllBorrowedShips.vue";

import { configureCsrfInterceptor } from "./shared/ajaxer";

import { SimpleMap } from "../shared/util/simpleTypes.js";

// Anything added here should also be in server.js:FRONTEND_ROUTES
// TODO(aiiane): make server.js just read it directly from here
const routes: RouteRecordRaw[] = [
  { path: "/", component: CharacterDashboard, meta: { keepAlive: false } },
  { path: "/roster", component: RosterList, meta: { keepAlive: true } },
  {
    path: "/character/:id",
    component: CharacterSheet,
    meta: { keepAlive: false },
  },
  { path: "/admin", redirect: "/admin/account-logs" },
  { path: "/admin/overview", component: AdminOverview },
  { path: "/admin/setup", component: AdminSetup },
  { path: "/admin/api", component: ApiAudit },
  { path: "/admin/api/:id", component: ApiAudit },
  { path: "/admin/account-logs", component: AccountLog },
  { path: "/admin/tasks", component: TaskControl },
  {
    path: "/admin/tasks/job/:id",
    component: JobDetail,
    props: (route) => ({
      taskId: parseInt(route.params.id as string),
    }),
  },
  { path: "/admin/citadels", component: CitadelManagement },

  {
    path: "/killmail/:id",
    component: KillmailDetail,
    props: (route) => ({
      killmailId: parseInt(route.params.id as string),
    }),
  },

  {
    path: "/srp",
    component: ShipReplacement,
    children: [
      {
        path: "",
        redirect: "/srp/dashboard",
      },
      {
        path: "dashboard",
        component: SrpDashboard,
      },
      {
        path: "history",
        component: CombatHistory,
        props: { triageMode: false },
      },
      {
        path: "export",
        component: SrpExportPage,
      },
      {
        path: "history/:id",
        component: CombatHistory,
        props: (route) => ({
          forAccount: parseInt(route.params.id as string),
          triageMode: false,
        }),
      },
      {
        path: "payments",
        component: PaymentHistory,
      },
      {
        path: "triage",
        component: CombatHistory,
        props: { triageMode: true },
      },
      {
        path: "triage/:id",
        component: CombatHistory,
        props: (route) => ({
          forAccount: parseInt(route.params.id as string),
          triageMode: true,
        }),
      },
      {
        path: "pay",
        component: PaymentTriage,
      },
    ],
  },
  {
    path: "/srp/payment/:id",
    component: PaymentDetail,
    props: (route) => ({ srpId: parseInt(route.params.id as string) }),
  },
  {
    path: "/srp/battle/:id",
    component: BattleDetail,
    props: (route) => ({ battleId: parseInt(route.params.id as string) }),
  },
  { path: "/ships", redirect: "/ships/borrowed-by-me" },
  { path: "/ships/borrowed-by-me", component: ShipsBorrowedByMe },
  { path: "/ships/borrowed-all", component: AllBorrowedShips },
];
if (process.env.NODE_ENV == "development") {
  routes.push(
    { path: "/dev/", component: DevPreview },
    { path: "/dev/:section", component: DevPreview },
  );
}

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
});

export interface Identity {
  account: {
    id: number;
  };
  access: SimpleMap<number>;
  isMember: boolean;
}

declare const $__IDENTITY: Identity;
declare const $__CSRF: string;
declare const $__NONCE: string;
configureCsrfInterceptor($__CSRF);
const app = createApp(HomePage, { identity: $__IDENTITY }).use(router);

app.provide("csrf", $__CSRF);
app.provide("nonce", $__NONCE);
app.config.errorHandler = (error, _, info) => {
  Sentry.setTag("info", info);
  Sentry.captureException(error);
};

app.mount("#app");
