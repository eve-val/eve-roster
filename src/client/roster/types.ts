import * as serverTypes from "../../shared/route/api/roster_GET.js";

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
