import { TnexBuilder, nullable, number, string, boolean, enu, json } from '../tnex';
import { PrivilegeName, KillmailType, HullCategory, SrpVerdictStatus, SrpVerdictReason } from './enums';
import { ZKillmail } from '../data-source/zkillboard/ZKillmail';


export const tables = new TnexBuilder();

export class AccessToken {
  accessToken_character = number();
  accessToken_refreshToken = string();
  accessToken_accessToken = string();
  accessToken_accessTokenExpires = number();
  accessToken_needsUpdate = boolean();
}
export const accessToken = tables.register(new AccessToken());

export class Account {
  account_id = number();
  account_created = number();
  account_mainCharacter = number();
  account_activeTimezone = nullable(string());
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
  character_corporationId = number();
  character_titles = nullable(string());
  character_startDate = nullable(number());
  character_logonDate = nullable(number());
  character_logoffDate = nullable(number());
  character_siggyScore = nullable(number());
  character_deleted = boolean();
}
export const character = tables.register(new Character());

export class CharacterLocation {
  charloc_character = number();
  charloc_timestamp = number();
  charloc_shipName = string();
  charloc_shipTypeId = number();
  charloc_shipItemId = number();
  charloc_solarSystemId = number();
}
export const characterLocation = tables.register(new CharacterLocation());

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
  citadel_name = string();
  citadel_type = string();
  citadel_allianceAccess = boolean();
  citadel_allianceOwned = boolean();
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
  gp_privilege = string();
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

export class CombatStats {
  cstats_character = number();
  cstats_killsInLastMonth = number();
  cstats_killValueInLastMonth = number();
  cstats_lossesInLastMonth = number();
  cstats_lossValueInLastMonth = number();
  cstats_updated = number();
}
export const combatStats =
    tables.register(new CombatStats(), 'characterCombatStats');

/**
 * A killmail from a member corporation.
 */
export class Killmail {
  km_id = number();
  km_timestamp = number();
  km_character = number();
  /** Currently always LOSS. */
  km_type = enu<KillmailType>();
  km_hullCategory = enu<HullCategory>();
  /**
   * If a ship, the related capsule loss for that character (if any), and
   * vice-versa.
   */
  km_relatedLoss = nullable(number());
  /**
   * The corporation whose killboard this loss was fetched from.
   */
  km_sourceCorporation = number();
  /**
   * The full JSON blob received from ZKillboard.
   */
  km_data = json<ZKillmail>();
}
export const killmail = tables.register(new Killmail());

export class MemberCorporation {
  memberCorporation_corporationId = number();
  memberCorporation_membership = string();
  // TODO_TS: apiKeyId should really just be a string...
  memberCorporation_apiKeyId = number();
  memberCorporation_apiVerificationCode = string();
}
export const memberCorporation = tables.register(new MemberCorporation());

export class Ownership {
  ownership_character = number();
  ownership_account = number();
  ownership_opsec = boolean();
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
  priv_requiresMembership = boolean();
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

export class SdeImport {
  simp_id = number();
  simp_md5 = string();
  simp_importerVersion = number();
  simp_timestamp = number();
}
export const sdeImport = tables.register(new SdeImport());

export class SdeType {
  styp_import = number();

  styp_id = number();
  styp_name = string();
  styp_searchName = string();
  styp_group = number();
  styp_category = number();
  styp_description = string();
  styp_mass = number();
  styp_volume = number();
  styp_capacity = number();
  styp_portionSize = number();
  styp_race = number();
  styp_basePrice = number();
  styp_marketGroup = number();
}
export const sdeType = tables.register(new SdeType());

export class SdeAttribute {
  sattr_import = number();

  sattr_id = number();
  sattr_name = string();
  sattr_description = string();
  sattr_defaultValue = number();
  sattr_icon = nullable(number());
  sattr_displayName = nullable(string());
  sattr_unit = nullable(number());
  sattr_category = nullable(number());
  sattr_published = boolean();
}
export const sdeAttribute = tables.register(new SdeAttribute());

export class SdeTypeAttribute {
  sta_type = number();
  sta_attribute = number();
  sta_valueInt = nullable(number());
  sta_valueFloat = nullable(number());
}
export const sdeTypeAttribute = tables.register(new SdeTypeAttribute());

/**
 * An SRP payment for a particular member. A single payment can include
 * multiple losses across multiple characters (if all owned by the same
 * account).
 */
export class SrpReimbursement {
  srpr_id = number();
  srpr_recipientCharacter = number();
  srpr_modified = number();
  srpr_paid = boolean();
  srpr_payingCharacter = nullable(number());
}
export const srpReimbursement = tables.register(new SrpReimbursement());

/**
 * Whether a loss is eligible for SRP. If so, how much to pay. If not, why.
 */
export class SrpVerdict {
  srpv_killmail = number();
  srpv_status = enu<SrpVerdictStatus>();
  /** Non-null iff status is Ineligible */
  srpv_reason = nullable(enu<SrpVerdictReason>());
  /** ISK */
  srpv_payout = number();
  /** Non-null iff status is Approved */
  srpv_reimbursement = nullable(number());
  srpv_modified = number();
  /**
   * The account that decided the verdict. Can be null even if a verdict has
   * been rendered if the verdict was decided by a bot.
   */
  srpv_renderingAccount = nullable(number());
}
export const srpVerdict = tables.register(new SrpVerdict());
