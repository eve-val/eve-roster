import { TnexBuilder, nullable, integer, varchar, bigInt, boolean, text, jsonb, strEnum, float4, decimal } from '../db/tnex';
import { PrivilegeName, HullCategory, SrpVerdictStatus, SrpVerdictReason } from './dao/enums';
import { ZKillmail } from '../data-source/zkillboard/ZKillmail';
import { BattleData } from '../domain/battle/BattleData';


export const tables = new TnexBuilder();

export class AccessToken {
  accessToken_character = integer();
  accessToken_refreshToken = varchar();
  accessToken_accessToken = varchar();
  accessToken_accessTokenExpires = bigInt();
  accessToken_needsUpdate = boolean();
  accessToken_scopes = jsonb<string[]>();
}
export const accessToken = tables.register(new AccessToken());

export class Account {
  account_id = integer();
  account_created = bigInt();
  account_mainCharacter = integer();
  account_activeTimezone = nullable(varchar());
  account_homeCitadel = nullable(integer());
}
export const account = tables.register(new Account());

export class AccountGroup {
  accountGroup_account = integer();
  accountGroup_group = varchar();
}
export const accountGroup = tables.register(new AccountGroup());

export class AccountLog {
  accountLog_id = integer();
  accountLog_timestamp = bigInt();
  accountLog_account = integer();
  accountLog_originalAccount = integer();
  // TODO_TS: really should be LoggableEvent
  accountLog_event = varchar();
  accountLog_relatedCharacter = nullable(integer());
  accountLog_data = nullable(text());
}
export const accountLog = tables.register(new AccountLog());

export class Battle {
  battle_id = integer();
  battle_start = bigInt();
  battle_end = bigInt();
  battle_data = jsonb<BattleData>();
}
export const battle = tables.register(new Battle());

export class Character {
  character_id = integer();
  character_name = varchar();
  character_corporationId = integer();
  character_roles = nullable(jsonb<string[]>());
  character_titles = nullable(jsonb<string[]>());
  character_startDate = nullable(bigInt());
  character_logonDate = nullable(bigInt());
  character_logoffDate = nullable(bigInt());
  character_siggyScore = nullable(integer());
  character_deleted = boolean();
}
export const character = tables.register(new Character());

export class CharacterLocation {
  charloc_character = integer();
  charloc_timestamp = bigInt();
  charloc_shipName = varchar();
  charloc_shipTypeId = integer();
  charloc_shipItemId = bigInt();
  charloc_solarSystemId = integer();
}
export const characterLocation = tables.register(new CharacterLocation());

export class CharacterSkillQueue {
  characterSkillQueue_character = integer();
  characterSkillQueue_queuePosition = integer();
  characterSkillQueue_skill = integer();
  characterSkillQueue_targetLevel = integer();
  characterSkillQueue_startTime = nullable(bigInt());
  characterSkillQueue_endTime = nullable(bigInt());
  characterSkillQueue_levelStartSp = integer();
  characterSkillQueue_levelEndSp = integer();
  characterSkillQueue_trainingStartSp = integer();
}
export const characterSkillQueue = tables.register(new CharacterSkillQueue());

export class CharacterShip {
  characterShip_id = integer();
  characterShip_character = integer();
  characterShip_itemId = bigInt();
  characterShip_typeId = integer();
  characterShip_name = varchar();
  characterShip_locationDescription = varchar();
}
export const characterShip = tables.register(new CharacterShip());

export class Citadel {
  citadel_id = integer();
  citadel_name = varchar();
  citadel_type = varchar();
  citadel_allianceAccess = boolean();
  citadel_allianceOwned = boolean();
}
export const citadel = tables.register(new Citadel());

export class Config {
  config_key = varchar();
  config_value = nullable(jsonb<number | string | boolean | any[] | object>());
  config_description = text();
}
export const config = tables.register(new Config());

export class CronLog {
  cronLog_id = integer();
  cronLog_task = varchar();
  cronLog_start = bigInt();
  cronLog_end = nullable(bigInt());
  cronLog_result = nullable(varchar());
}
export const cronLog = tables.register(new CronLog());

export class Group {
  group_name = varchar();
}
export const group = tables.register(new Group());

export class GroupExplicit {
  groupExplicit_id = integer();
  groupExplicit_account = integer();
  groupExplicit_group = varchar();
}
export const groupExplicit = tables.register(new GroupExplicit());

export class GroupPriv {
  gp_group = varchar();
  gp_privilege = varchar();
  gp_level = integer();
}
export const groupPriv = tables.register(new GroupPriv());

export class GroupTitle {
  groupTitle_id = integer();
  groupTitle_corporation = integer();
  groupTitle_title = varchar();
  groupTitle_group = varchar();
}
export const groupTitle = tables.register(new GroupTitle());

export class CombatStats {
  cstats_character = integer();
  cstats_killsInLastMonth = integer();
  cstats_killValueInLastMonth = bigInt();
  cstats_lossesInLastMonth = integer();
  cstats_lossValueInLastMonth = bigInt();
  cstats_updated = bigInt();
}
export const combatStats =
    tables.register(new CombatStats(), 'characterCombatStats');

/**
 * A killmail from a member corporation.
 */
export class Killmail {
  km_id = integer();
  km_timestamp = bigInt();
  km_character = nullable(integer());

  km_victimCorp = nullable(integer());

  km_hullCategory = strEnum<HullCategory>();

  /**
   * If a ship, the related capsule loss for that character (if any). If a
   * capsule, the related ship loss (if any).
   */
  km_relatedLoss = nullable(integer());

  /** The full JSON blob received from ZKillboard. */
  km_data = jsonb<ZKillmail>();

  /**
   * Whether the killmail has been processed: had its related loss computed,
   * SRP entry created, etc.
   */
  km_processed = boolean();
}
export const killmail = tables.register(new Killmail());

export class KillmailBattle {
  kmb_killmail = integer();
  kmb_battle = integer();
}
export const killmailBattle = tables.register(new KillmailBattle());

export class MemberCorporation {
  mcorp_corporationId = integer();
  mcorp_membership = varchar();
  mcorp_name = varchar();
  mcorp_ticker = varchar();
}
export const memberCorporation = tables.register(new MemberCorporation());

export class Ownership {
  ownership_character = integer();
  ownership_account = integer();
  ownership_opsec = boolean();
  ownership_ownerHash = nullable(text());
}
export const ownership = tables.register(new Ownership());

export class PendingOwnership {
  pendingOwnership_character = integer();
  pendingOwnership_account = integer();
  pendingOwnership_ownerHash = text();
}
export const pendingOwnership = tables.register(new PendingOwnership());

export class Privilege {
  priv_name = strEnum<PrivilegeName>();
  priv_category = varchar();
  priv_ownerLevel = integer();
  priv_requiresMembership = boolean();
  priv_description = text();
}
export const privilege = tables.register(new Privilege);

export class Skillsheet {
  skillsheet_character = integer();
  skillsheet_skill = integer();
  skillsheet_level = integer();
  skillsheet_skillpoints = integer();
}
export const skillsheet = tables.register(new Skillsheet());

export class SdeImport {
  simp_id = integer();
  simp_md5 = varchar();
  simp_importerVersion = integer();
  simp_timestamp = bigInt();
}
export const sdeImport = tables.register(new SdeImport());

// TODO: All of the float4s here and elsewhere should probably be float8s.
// Knex docs claim float() creates float8s but it actually just creates float4s.
export class SdeType {
  styp_import = integer();

  styp_id = integer();
  styp_name = varchar();
  styp_searchName = varchar();
  styp_group = integer();
  styp_category = integer();
  styp_description = text();
  styp_mass = float4();
  styp_volume = float4();
  styp_capacity = float4();
  styp_portionSize = integer();
  styp_race = integer();
  styp_basePrice = decimal(19, 4);
  styp_marketGroup = integer();
}
export const sdeType = tables.register(new SdeType());

export class SdeAttribute {
  sattr_import = integer();

  sattr_id = integer();
  sattr_name = varchar();
  sattr_description = text();
  sattr_defaultValue = float4();
  sattr_icon = nullable(integer());
  sattr_displayName = nullable(varchar());
  sattr_unit = nullable(integer());
  sattr_category = nullable(integer());
  sattr_published = boolean();
}
export const sdeAttribute = tables.register(new SdeAttribute());

export class SdeTypeAttribute {
  sta_type = integer();
  sta_attribute = integer();
  sta_valueInt = nullable(integer());
  sta_valueFloat = nullable(float4());
}
export const sdeTypeAttribute = tables.register(new SdeTypeAttribute());

/**
 * An SRP payment for a particular member. A single payment can include
 * multiple losses across multiple characters (if all owned by the same
 * account).
 */
export class SrpReimbursement {
  srpr_id = integer();
  srpr_recipientCharacter = integer();
  srpr_modified = bigInt();
  srpr_paid = boolean();
  srpr_payingCharacter = nullable(integer());
}
export const srpReimbursement = tables.register(new SrpReimbursement());

/**
 * Whether a loss is eligible for SRP. If so, how much to pay. If not, why.
 */
export class SrpVerdict {
  srpv_killmail = integer();
  srpv_status = strEnum<SrpVerdictStatus>();
  /** Non-null iff status is Ineligible */
  srpv_reason = nullable(strEnum<SrpVerdictReason>());
  /** ISK */
  srpv_payout = integer();
  /** Non-null iff status is Approved */
  srpv_reimbursement = nullable(integer());
  srpv_modified = bigInt();
  /**
   * The account that decided the verdict. Can be null even if a verdict has
   * been rendered if the verdict was decided by a bot.
   */
  srpv_renderingAccount = nullable(integer());
}
export const srpVerdict = tables.register(new SrpVerdict());
