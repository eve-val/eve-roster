import { SrpLossJson } from "../../../../types/srp/SrpLossJson.js";
import { SimpleNumMap } from "../../../../util/simpleTypes.js";

export interface Srp_Payment_GET {
  payment: {
    id: number;
    recipient: number;
    modified: number;
    modifiedLabel: string;
    paid: boolean;
    payer: number | null;
  };
  losses: SrpLossJson[];
  names: SimpleNumMap<string>;
}
