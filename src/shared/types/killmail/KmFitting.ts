export interface KmFitting {
  ship: number;
  sections: (KmSlotSection | KmHoldSection)[];
}

export interface KmSlotSection {
  type: "slots";
  name: string;
  label: string;
  rank: number;
  slots: ({
    module?: KmItem;
    charge?: KmItem;
  } | null)[];
}

export interface KmHoldSection {
  type: "hold";
  name: string;
  label: string;
  rank: number;
  hold: KmItem[];
}

export interface KmItem {
  typeId: number;
  status: DropStatus;
  count: number;
}

type DropStatus = "dropped" | "destroyed";
