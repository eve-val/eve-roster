import { SkillQueueSummary } from "../../types/SkillQueueSummary.js";

export interface Dashboard_GET {
  accountId: number;
  characters: CharacterJson[];
  transfers: { character: number; name: string }[];
  loginParams: string;
  mainCharacter: number;
  access: {
    designateMain: number;
    isMember: boolean;
  };
}

export interface CharacterJson {
  id: number;
  name: string;
  opsec: boolean;
  corpStatus: string;
  skillQueue: SkillQueueSummary;
  corpId: number;
  needsReauth: boolean;
}
