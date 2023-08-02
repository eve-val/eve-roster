import { SimpleNumMap } from "../../../../util/simpleTypes.js";

export interface Srp_Payment_dir_GET {
  payments: PaymentJson[];
  names: SimpleNumMap<string>;
}

export interface PaymentJson {
  id: number;
  modified: number;
  modifiedStr: string;
  totalPayout: number;
  totalLosses: number;
  recipient: number;
  recipientCorp: number | null;
  payer: number | null;
  payerCorp: number | null;
}
