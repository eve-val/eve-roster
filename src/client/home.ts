import { createApp } from "vue";
import { createRouter, createWebHistory, RouteRecordRaw } from "vue-router";
import "./css/home.css";
import Home from "./Home.vue";

import Dashboard from "./dashboard/Dashboard.vue";
import Character from "./character/Character.vue";
import Roster from "./roster/Roster.vue";

import AdminOverview from "./admin/AdminOverview.vue";
import AccountLog from "./admin/AccountLog.vue";
import AdminSetup from "./admin/Setup.vue";
import Tasks from "./admin/Tasks.vue";
import CitadelManagement from "./admin/CitadelManagement.vue";
import Dev from "./dev/Dev.vue";

import Srp from "./srp/Srp.vue";
import SrpDashboard from "./srp/SrpDashboard.vue";
import CombatHistory from "./srp/CombatHistory.vue";
import PaymentHistory from "./srp/PaymentHistory.vue";
import PaymentTriage from "./srp/PaymentTriage.vue";
import PaymentDetail from "./srp/PaymentDetail.vue";
import BattleDetail from "./srp/battles/BattleDetail.vue";

import ShipsBorrowedByMe from "./ships/ShipsBorrowedByMe.vue";
import AllBorrowedShips from "./ships/AllBorrowedShips.vue";

import { SimpleMap } from "../util/simpleTypes";

// Anything added here should also be in server.js:FRONTEND_ROUTES
// TODO(aiiane): make server.js just read it directly from here
const routes: RouteRecordRaw[] = [
  { path: "/", component: Dashboard, meta: { keepAlive: false } },
  { path: "/roster", component: Roster, meta: { keepAlive: true } },
  { path: "/character/:id", component: Character, meta: { keepAlive: false } },
  { path: "/admin", redirect: "/admin/account-logs" },
  { path: "/admin/overview", component: AdminOverview },
  { path: "/admin/setup", component: AdminSetup },
  { path: "/admin/account-logs", component: AccountLog },
  { path: "/admin/tasks", component: Tasks },
  { path: "/admin/citadels", component: CitadelManagement },

  {
    path: "/srp",
    component: Srp,
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
        path: "history/:id",
        component: CombatHistory,
        props: (route) => ({
          forAccount: parseInt(<string>route.params.id),
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
          forAccount: parseInt(<string>route.params.id),
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
    props: (route) => ({ srpId: parseInt(<string>route.params.id) }),
  },
  {
    path: "/srp/battle/:id",
    component: BattleDetail,
    props: (route) => ({ battleId: parseInt(<string>route.params.id) }),
  },
  { path: "/ships", redirect: "/ships/borrowed-by-me" },
  { path: "/ships/borrowed-by-me", component: ShipsBorrowedByMe },
  { path: "/ships/borrowed-all", component: AllBorrowedShips },
];
if (process.env.NODE_ENV == "development") {
  routes.push(
    { path: "/dev/", component: Dev },
    { path: "/dev/:section", component: Dev }
  );
}

const router = createRouter({
  history: createWebHistory(),
  routes: routes,
});

export type Identity = {
  account: {
    id: number;
  };
  access: SimpleMap<number>;
  isMember: boolean;
};

declare const $__IDENTITY: Identity;
createApp(Home, {
  identity: $__IDENTITY, // eslint-disable-line no-undef
})
  .use(router)
  .mount("#app");
