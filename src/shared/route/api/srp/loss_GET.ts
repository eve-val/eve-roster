import { SrpLossJson } from "../../../types/srp/SrpLossJson.js";
import { SimpleNumMap } from "../../../util/simpleTypes.js";

export interface Srp_Loss_GET {
  srps: SrpLossJson[];
  names: SimpleNumMap<string>;
}
