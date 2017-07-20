import { TnexBuilder, nullable, number, string, boolinum, enu } from '../tnex';
import { PrivilegeName } from './enums';

export const tables = new TnexBuilder();

export class AccessToken {
  accessToken_character = number();
  accessToken_refreshToken = string();
  accessToken_accessToken = string();
  accessToken_accessTokenExpires = number();
  accessToken_needsUpdate = boolinum();
}
export const accessToken = tables.register(new AccessToken());

export class Account {
  account_id = number();
  account_created = number();
  account_mainCharacter = number();
  account_activeTimezone = nullable(string());
  // TODO_TS: Update db schema to reflect reality
  account_homeCitadel = nullable(number());
}
export const account = tables.register(new Account());

export class AccountGroup {
  accountGroup_account = number();
  accountGroup_group = string();
}
export const accountGroup = tables.register(new AccountGroup());

export class AccountLog {
  accountLog_id = number();
  accountLog_timestamp = number();
  accountLog_account = number();
  accountLog_originalAccount = number();
  // TODO_TS: really should be LoggableEvent
  accountLog_event = string();
  accountLog_relatedCharacter = nullable(number());
  accountLog_data = nullable(string());
}
export const accountLog = tables.register(new AccountLog());

export class Character {
  character_id = number();
  character_name = string();
  // TODO_TS: Change schema to not-nullable
  character_corporationId = number();
  character_titles = nullable(string());
  character_startDate = nullable(number());
  character_logonDate = nullable(number());
  character_logoffDate = nullable(number());
  character_siggyScore = nullable(number());
}
export const character = tables.register(new Character());

export class CharacterSkillQueue {
  characterSkillQueue_character = number();
  characterSkillQueue_queuePosition = number();
  characterSkillQueue_skill = number();
  characterSkillQueue_targetLevel = number();
  characterSkillQueue_startTime = nullable(number());
  characterSkillQueue_endTime = nullable(number());
  characterSkillQueue_levelStartSp = number();
  characterSkillQueue_levelEndSp = number();
  characterSkillQueue_trainingStartSp = number();
}
export const characterSkillQueue = tables.register(new CharacterSkillQueue());

export class Citadel {
  citadel_id = number();
  // TODO_TS: Modify DB schema to remove nullable
  citadel_name = string();
  citadel_type = string();
  citadel_allianceAccess = boolinum();
  citadel_allianceOwned = boolinum();
}
export const citadel = tables.register(new Citadel());

export class Config {
  config_key = string();
  config_value = nullable(string());
  config_description = nullable(string());
}
export const config = tables.register(new Config());

export class CronLog {
  cronLog_id = number();
  cronLog_task = string();
  cronLog_start = number();
  cronLog_end = nullable(number());
  cronLog_result = nullable(string());
}
export const cronLog = tables.register(new CronLog());

export class Group {
  group_name = string();
}
export const group = tables.register(new Group());

export class GroupExplicit {
  groupExplicit_id = number();
  groupExplicit_account = number();
  groupExplicit_group = string();
}
export const groupExplicit = tables.register(new GroupExplicit());

export class GroupPriv {
  gp_group = string();
  gp_privilege: string;
  gp_level = number();
}
export const groupPriv = tables.register(new GroupPriv());

export class GroupTitle {
  groupTitle_id = number();
  groupTitle_corporation = number();
  groupTitle_title = string();
  groupTitle_group = string();
}
export const groupTitle = tables.register(new GroupTitle());

export class Killboard {
  killboard_character = number();
  killboard_killsInLastMonth = nullable(number());
  killboard_killValueInLastMonth = nullable(number());
  killboard_lossesInLastMonth = nullable(number());
  killboard_lossValueInLastMonth = nullable(number());
  killboard_updated = number();
}
export const killboard = tables.register(new Killboard());

export class Location {
  location_character = number();
  location_timestamp = number();
  location_shipName = string();
  location_shipTypeId = number();
  location_shipItemId = number();
  location_solarSystemId = number();
}
export const location = tables.register(new Location());

export class MemberCorporation {
  memberCorporation_corporationId = number();
  memberCorporation_membership = string();
  // TODO_TS: apiKeyId should really just be a string...
  // TODO_TS: Remove nullable from db schema
  memberCorporation_apiKeyId = nullable(number());
  memberCorporation_apiVerificationCode = nullable(string());
}
export const memberCorporation = tables.register(new MemberCorporation());

export class Ownership {
  ownership_character = number();
  ownership_account = number();
  ownership_opsec = boolinum();
}
export const ownership = tables.register(new Ownership());

export class PendingOwnership {
  pendingOwnership_character = number();
  pendingOwnership_account = number();
}
export const pendingOwnership = tables.register(new PendingOwnership());

export class Privilege {
  priv_name = enu<PrivilegeName>();
  priv_category = string();
  priv_ownerLevel = number();
  priv_requiresMembership = boolinum();
  priv_description = string();
}
export const privilege = tables.register(new Privilege);

export class Skillsheet {
  skillsheet_character = number();
  skillsheet_skill = number();
  skillsheet_level = number();
  skillsheet_skillpoints = number();
}
export const skillsheet = tables.register(new Skillsheet());
