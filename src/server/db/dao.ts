import AccessTokenDao from "./dao/AccessTokenDao.js";
import AccountDao from "./dao/AccountDao.js";
import BattleDao from "./dao/BattleDao.js";
import CharacterDao from "./dao/CharacterDao.js";
import CharacterLocationDao from "./dao/CharacterLocationDao.js";
import CharacterNotificationDao from "./dao/CharacterNotificationDao.js";
import CharacterShipDao from "./dao/CharacterShipDao.js";
import CitadelDao from "./dao/CitadelDao.js";
import CombatStatsDao from "./dao/CombatStatsDao.js";
import ConfigDao from "./dao/ConfigDao.js";
import CronDao from "./dao/CronDao.js";
import GroupsDao from "./dao/GroupsDao.js";
import KillmailDao from "./dao/KillmailDao.js";
import LogDao from "./dao/LogDao.js";
import OwnershipDao from "./dao/OwnershipDao.js";
import RosterDao from "./dao/RosterDao.js";
import SdeDao from "./dao/SdeDao.js";
import SkillQueueDao from "./dao/SkillQueueDao.js";
import SkillsheetDao from "./dao/SkillsheetDao.js";
import SrpDao from "./dao/SrpDao.js";
import StatisticsDao from "./dao/StatisticsDao.js";

export class Dao {
  // This strucure is necessary in order to avoid circular dependencies.
  // This way, both, say, the CharacterDao and the AccountDao could call methods
  // on each other without introducing a circular dep.

  public readonly accessToken = new AccessTokenDao(this);
  public readonly account = new AccountDao(this);
  public readonly battle = new BattleDao(this);
  public readonly character = new CharacterDao(this);
  public readonly characterLocation = new CharacterLocationDao(this);
  public readonly characterNotification = new CharacterNotificationDao(this);
  public readonly characterShip = new CharacterShipDao(this);
  public readonly citadel = new CitadelDao(this);
  public readonly combatStats = new CombatStatsDao(this);
  public readonly config = new ConfigDao(this);
  public readonly cron = new CronDao(this);
  public readonly group = new GroupsDao(this);
  public readonly killmail = new KillmailDao(this);
  public readonly log = new LogDao(this);
  public readonly ownership = new OwnershipDao(this);
  public readonly roster = new RosterDao(this);
  public readonly sde = new SdeDao(this);
  public readonly srp = new SrpDao(this);
  public readonly skillQueue = new SkillQueueDao(this);
  public readonly skillsheet = new SkillsheetDao(this);
  public readonly statistics = new StatisticsDao(this);
}

export const dao = new Dao();
