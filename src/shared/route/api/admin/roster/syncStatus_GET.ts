import { SimpleNumMap } from "../../../../util/simpleTypes.js";

export interface Admin_Roster_SyncStatus_GET {
  corporations: CorpSection[];
  names: SimpleNumMap<string>;
}

export interface CorpSection {
  id: number;
  type: string;
  directors: {
    id: number;
    name: string;
    canUseToken: boolean;
    tokenStatusLabel: string;
  }[];
}
