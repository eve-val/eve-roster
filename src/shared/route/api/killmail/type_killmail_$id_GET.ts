import { EsiKillmail } from "../../../types/esi/EsiKillmail.js";
import { KmFitting } from "../../../types/killmail/KmFitting.js";
import { SimpleNumMap } from "../../../util/simpleTypes.js";

export interface Killmail_$Id_GET {
  killmail: EsiKillmail;
  fitting: KmFitting;
  prices: SimpleNumMap<number>;
  meta: {
    hash: string;
  };
  names: SimpleNumMap<string>;
}
