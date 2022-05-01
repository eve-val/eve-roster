import * as serverTypes from "../../route/api/roster.js";

export interface Character extends serverTypes.CharacterJson {
  totalSp?: number;
  activityScore?: number;
  opsec?: boolean;
}

export interface Account extends serverTypes.AccountJson {
  main: Character;
  alts: Character[];
  aggregate?: Character;
}
