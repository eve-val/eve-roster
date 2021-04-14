import AccessTokenDao from './dao/AccessTokenDao';
import AccountDao from './dao/AccountDao';
import BattleDao from './dao/BattleDao';
import CharacterDao from './dao/CharacterDao';
import CharacterLocationDao from './dao/CharacterLocationDao';
import CharacterNotificationDao from './dao/CharacterNotificationDao';
import CharacterShipDao from './dao/CharacterShipDao';
import CitadelDao from './dao/CitadelDao';
import CombatStatsDao from './dao/CombatStatsDao';
import ConfigDao from './dao/ConfigDao';
import CronDao from './dao/CronDao';
import GroupsDao from './dao/GroupsDao';
import KillmailDao from './dao/KillmailDao';
import LogDao from './dao/LogDao';
import OwnershipDao from './dao/OwnershipDao';
import RosterDao from './dao/RosterDao';
import SdeDao from './dao/SdeDao';
import SkillQueueDao from './dao/SkillQueueDao';
import SkillsheetDao from './dao/SkillsheetDao';
import SrpDao from './dao/SrpDao';
import StatisticsDao from './dao/StatisticsDao';


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
