import { SrpVerdictStatus, SrpVerdictReason } from "../dao/enums";
import { Nullable } from "../util/simpleTypes";


/**
 * JSON format for corp ship losses. Combines killmail information with SRP
 * information and an optional set of triage suggestions.
 */
export interface SrpLossJson {
  killmail: number,
  timestamp: string,
  shipType: number,
  victim: number,
  victimCorp: number,
  executioner: AttackerJson,
  relatedKillmail: {
    id: number | null,
    shipId: number | null,
  } | null,
  status: UnifiedSrpLossStatus,
  reason: SrpVerdictReason | null,
  payout: number,
  reimbursement: number | null,
  payingCharacter: number | null,
  triage: SrpTriageJson | null,
}

export interface SrpTriageJson {
  extraOptions: VerdictOptionJson[],
  suggestedOption: string,
}

export interface VerdictOptionJson {
  label: string,
  key: string,
  payout: number,
  verdict: SrpVerdictStatus,
}

export type AttackerJson =
    PlayerAttackerJson | StructureAttackerJson | NpcAttackerJson;

export interface PlayerAttackerJson {
  type: 'player',
  character: number,
  corporation: number,
  alliance: number | undefined,
}

export interface StructureAttackerJson {
  type: 'structure',
  ship: number | undefined,
  corporation: number,
}

export interface NpcAttackerJson {
  type: 'npc',
  ship: number | undefined,
}

export type UnifiedSrpLossStatus = SrpVerdictStatus | 'paid';
