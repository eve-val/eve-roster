import { Participant } from "../../../../types/srp/battle/BattleData.js";
import { SimpleNumMap } from "../../../../util/simpleTypes.js";
import { SrpLossJson } from "../../../../types/srp/SrpLossJson.js";

export interface Srp_Battle_GET {
  battles: BattleJson[];
  names: SimpleNumMap<string>;
}

export interface BattleJson {
  id: number;
  start: number;
  startLabel: string;
  end: number;
  locations: number[];
  teams: Team[];
  srps: SrpLossJson[];
}

export interface Team {
  teamId: number;
  corporationId: number | null;
  allianceId: number | null;
  members: Participant[];
  totalLosses: number;
  type: "corporation" | "alliance" | "unaffiliated";
}
