export enum ToolTipGravityPrimary {
  LEFT = "left",
  TOP = "top",
  RIGHT = "right",
  BOTTOM = "bottom",
}

export enum ToolTipGravitySecondary {
  START = "start",
  CENTER = "center",
  END = "end",
}

export type ToolTipGravity =
  | `${ToolTipGravityPrimary}`
  | `${ToolTipGravityPrimary} ${ToolTipGravitySecondary}`;
