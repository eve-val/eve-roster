
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
