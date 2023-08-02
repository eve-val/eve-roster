import type { SrpVerdictStatus, SrpVerdictReason } from "./srpEnums.js";

/**
 * JSON format for corp ship losses. Combines killmail information with SRP
 * information and an optional set of triage suggestions.
 */
export interface SrpLossJson {
  killmail: number;
  timestamp: string;
  shipType: number;
  victim?: number;
  victimCorp?: number;
  executioner: AttackerJson;
  relatedKillmail: {
    id: number;
    shipId: number;
  } | null;
  status: UnifiedSrpLossStatus;
  reason: SrpVerdictReason | null;
  tag: string | null;
  payout: number;
  reimbursement: number | null;
  payingCharacter: number | null;
  renderingCharacter: number | null;
  triage: SrpTriageJson | null;
  battle: number | null;
}

export interface SrpTriageJson {
  extraOptions: VerdictOptionJson[];
  suggestedOption: string;
}

export interface VerdictOptionJson {
  label: string;
  key: string;
  payout: number;
  verdict: SrpVerdictStatus;
}

export interface AttackerJson {
  ship?: number;
  character?: number;
  corporation?: number;
  alliance?: number;
  faction?: number;
}

export type UnifiedSrpLossStatus = SrpVerdictStatus | "paid";
