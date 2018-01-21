
export type PrivilegeName =
    | 'accountLogs'
    | 'adminConsole'
    | 'characterActivityStats'
    | 'characterIsOpsec'
    | 'characterSkills'
    | 'characterSkillQueue'
    | 'citadels'
    | 'cronLogs'
    | 'memberAlts'
    | 'memberGroups'
    | 'memberHousing'
    | 'memberOpsecAlts'
    | 'memberTimezone'
    | 'roster'
    | 'serverConfig'
    | 'serverLogs'
    | 'srp'
    ;

export enum KillmailType {
  KILL = 'kill',
  LOSS = 'loss',
}

export enum HullCategory {
  CAPSULE = 'capsule',
  SHIP = 'ship',
}

export enum SrpVerdictStatus {
  PENDING = 'pending',
  APPROVED = 'approved',
  INELIGIBLE = 'ineligible',
}

export enum SrpVerdictReason {
  /** This ship is never covered by SRP */
  NOT_COVERED = 'not_covered',
  /** Hull is covered, but fit is not doctrine/missing modules/etc. */
  INVALID_FIT = 'invalid_fit',
  /** Loss didn't take place during a fleet fight, e.g. during PvE. */
  INVALID_ENGAGEMENT = 'invalid_engagement',
  /** Died to NPCs */
  NPC = 'npc',
  /** Specialized version of INVALID_ENGAGEMENT: solo combat. */
  SOLO = 'solo',
  /** Pilot has opted out of receiving SRP. */
  OPT_OUT = 'opt_out',
  /** Character is no longer a member. */
  NO_LONGER_A_MEMBER = 'no_longer_a_member',
  /** Loss is obsolete, perhaps due to being paid via some other channel. */
  OBSOLETE = 'obsolete',
  /** Uncategorized reason for ignoring a loss. */
  MISC = 'misc',
}
