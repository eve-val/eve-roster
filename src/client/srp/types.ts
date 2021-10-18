import { SimpleNumMap } from "../../util/simpleTypes";

export interface Loss {
  payout: number;
  killmail: number;
}
export interface Losses {
  srps: Loss[];
  names: SimpleNumMap<string>;
}
export interface Payment {
  id: number;
  paid: boolean;
  payer: number;
  recipient: number;
  modified: number;
  modifiedLabel: string;
  totalPayout: number;
}
export interface Payments {
  payments: Payment[];
  names: SimpleNumMap<string>;
}
export interface Transaction {
  names: SimpleNumMap<string>;
  payment: Payment;
  losses: Loss[];
}
export interface Battles {
  names: SimpleNumMap<string>;
  battles: Battle[];
}
export interface Battle {
  id: number;
  teams: {
    totalLosses: number;
  }[];
}

export interface VerdictOption {
  key: string;
  label: string;
  verdict: string;
  payout: number;
  reason: string | null;
}

export interface Triage {
  suggestedOption: string;
  extraOptions: VerdictOption[];
}

export interface Srp {
  status: string;
  reason: string | null;
  killmail: number;
  relatedKillmail: {
    id: number;
  };
  victim: number;
  victimCorp: number;
  executioner: {
    character: number;
    ship: number;
    alliance: number;
    corporation: number;
  };
  triage: null | Triage;
  payout: number | null;
  payingCharacter: number | null;
  renderingCharacter: number | null;
  reimbursement: number | null;
}
