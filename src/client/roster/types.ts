import * as serverTypes from "../../route/api/roster";

export interface Character extends serverTypes.CharacterJson {
  totalSp?: number;
  activityScore?: number;
  opsec?: boolean;
}

export interface Account extends serverTypes.AccountJson {
  aggregate: Character;
}
