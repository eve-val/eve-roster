export type PrivilegeName =
  | "api"
  | "accountLogs"
  | "adminConsole"
  | "characterActivityStats"
  | "characterIsOpsec"
  | "characterShips"
  | "characterSkills"
  | "characterSkillQueue"
  | "citadels"
  | "cronLogs"
  | "memberAlts"
  | "memberGroups"
  | "memberHousing"
  | "memberOpsecAlts"
  | "memberTimezone"
  | "roster"
  | "serverConfig"
  | "serverLogs"
  | "srp";

export enum HullCategory {
  CAPSULE = "capsule",
  SHIP = "ship",
}

export enum SrpVerdictStatus {
  PENDING = "pending",
  APPROVED = "approved",
  INELIGIBLE = "ineligible",
}

export enum SrpVerdictReason {
  /** This ship is never covered by SRP */
  NOT_COVERED = "not_covered",
  /** Hull is covered, but fit is not doctrine/missing modules/etc. */
  INVALID_FIT = "invalid_fit",
  /** Loss didn't take place during a fleet fight, e.g. during PvE. */
  INVALID_ENGAGEMENT = "invalid_engagement",
  /** Died to NPCs */
  NPC = "npc",
  /** Specialized version of INVALID_ENGAGEMENT: solo combat. */
  SOLO = "solo",
  /** Pilot has opted out of receiving SRP. */
  OPT_OUT = "opt_out",
  /** Character is no longer a member. */
  NO_LONGER_A_MEMBER = "no_longer_a_member",
  /** Loss is obsolete, perhaps due to being paid via some other channel. */
  OBSOLETE = "obsolete",
  /** Uncategorized reason for ignoring a loss. */
  MISC = "misc",
  /** Loss is of a ship the corp provides for free. Player should take a replacement. */
  CORP_PROVIDED = "corp_provided",
  /**
   * Loss occurred before this system had jurisdiction over SRP. Can only be
   * set by the system.
   */
  OUTSIDE_JURISDICTION = "outside_jurisdiction",
  /**
   * Loss cannot be attributed to a character. Can only be set by the system.
   */
  NO_RECIPIENT = "no_recipient",
}
